import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { encryptData, decryptData } from "@/lib/crypto";
import { useAuthStore } from "@/stores/authStore";
import { useTodoStore } from "@/stores/todoStore";
import { indexedDBStorage } from "@/lib/indexedDBStorage";

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedTodoItem {
  id: string;
  encryptedData: string;
}

export interface TodoList {
  title: string;
  storageKey: string;
  todos: TodoItem[];
  lastModified: Date;
}

class FirestoreService {
  private listeners: Map<string, () => void> = new Map();

  async saveTodoListToFirestore(
    user: User,
    listTitle: string,
    storageKey: string,
    todos: TodoItem[],
    passphrase: string
  ): Promise<void> {
    if (!user) return;

    try {
      const encryptedTodos = await Promise.all(
        todos
          .filter((todo) => todo && todo.id)
          .map(async (todo) => {
            const encryptedData = await encryptData(
              JSON.stringify(todo),
              user.uid,
              passphrase
            );
            return {
              id: todo.id,
              encryptedData,
            };
          })
      );

      const listDocRef = doc(db, "users", user.uid, "todoLists", storageKey);
      await setDoc(
        listDocRef,
        {
          title: listTitle,
          storageKey: storageKey,
          todos: encryptedTodos,
          lastModified: Timestamp.now(),
        },
        { merge: true }
      );

      console.log(
        `Todo list '${listTitle}' saved to Firestore with document ID: ${storageKey}`
      );
    } catch (error) {
      console.error(
        `Error saving todo list '${listTitle}' to Firestore:`,
        error
      );
      throw error;
    }
  }

  async syncTodoListToFirestore(
    user: User,
    listTitle: string,
    todoList: TodoList
  ): Promise<void> {
    if (!user) return;

    try {
      const encryptedTodos = await Promise.all(
        todoList.todos
          .filter((todo) => todo && todo.id)
          .map(async (todo) => {
            // Use cached key - encryption will fall back to passphrase derivation if needed
            const encryptedData = await encryptData(
              JSON.stringify(todo),
              user.uid
            );
            return {
              id: todo.id,
              encryptedData,
            };
          })
      );

      const listDocRef = doc(db, "users", user.uid, "todoLists", todoList.storageKey);
      await setDoc(
        listDocRef,
        {
          title: listTitle,
          storageKey: todoList.storageKey,
          todos: encryptedTodos,
          lastModified: Timestamp.now(),
        },
        { merge: true }
      );

      console.log(
        `Todo list '${listTitle}' synced to Firestore`
      );
    } catch (error) {
      console.error(
        `Error syncing todo list '${listTitle}' to Firestore:`,
        error
      );
      throw error;
    }
  }

  async loadAllTodoListsFromFirestore(
    user: User,
    passphrase: string
  ): Promise<Record<string, TodoList>> {
    if (!user) return {};
    
    // Key will be derived on-demand when needed
    console.log('Loading todo lists from Firestore');

    try {
      const todoListsRef = collection(db, "users", user.uid, "todoLists");
      const querySnapshot = await getDocs(todoListsRef);
      const lists: Record<string, TodoList> = {};

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const storageKey = data.storageKey;

        if (storageKey && data.todos) {
          const decryptedTodos = await Promise.all(
            data.todos.map(async (todo: EncryptedTodoItem) => {
              const decryptedData = await decryptData(
                todo.encryptedData,
                user.uid,
                passphrase
              );
              return JSON.parse(decryptedData as string);
            })
          );
          lists[data.title] = {
            title: data.title,
            storageKey: storageKey,
            todos: decryptedTodos,
            lastModified: data.lastModified?.toDate() || new Date(),
          };
        }
      }
      console.log("All todo lists loaded from Firestore");
      return lists;
    } catch (error) {
      console.error("Error loading todo lists from Firestore:", error);
      throw error;
    }
  }

  async deleteTodoListFromFirestore(
    user: User,
    storageKey: string
  ): Promise<void> {
    if (!user) return;

    try {
      const listDocRef = doc(db, "users", user.uid, "todoLists", storageKey);
      await deleteDoc(listDocRef);
      console.log(
        `Todo list deleted from Firestore (document ID: ${storageKey})`
      );
    } catch (error) {
      console.error(`Error deleting todo list from Firestore:`, error);
      throw error;
    }
  }

  subscribeToUserTodoLists(
    _user: User,
    _callback?: (lists: Record<string, TodoList>) => void
  ): () => void {
    // Listener disabled (write-only sync)
    return () => {};
  }

  async createTodoList(
    user: User,
    title: string,
    storageKey: string,
    todos: TodoItem[] = [],
    passphrase: string = ''
  ): Promise<void> {
    if (!user) return;

    try {
      await this.saveTodoListToFirestore(user, title, storageKey, todos, passphrase);
      localStorage.setItem(storageKey, JSON.stringify(todos));
      console.log(`New todo list '${title}' created with storage key '${storageKey}'`);
    } catch (error) {
      console.error(`Error creating todo list '${title}':`, error);
      throw error;
    }
  }

  async getAllTodoListsWithMetadata(
    user: User,
    passphrase?: string
  ): Promise<Record<string, TodoList>> {
    if (!user) return {};
    
    try {
      const todoListsRef = collection(db, "users", user.uid, "todoLists");
      const querySnapshot = await getDocs(todoListsRef);
      const lists: Record<string, TodoList> = {};

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        lists[data.title] = {
          title: data.title,
          storageKey: data.storageKey,
          todos: [], // Metadata only, no todos
          lastModified: data.lastModified?.toDate() || new Date(),
        };
      }
      
      console.log("Todo list metadata loaded from Firestore");
      return lists;
    } catch (error) {
      console.error("Error loading todo list metadata from Firestore:", error);
      return {};
    }
  }

  async syncLocalStorageChange(user: User, storageKey: string, passphrase: string = ''): Promise<void> {
    if (!user) return;

    try {
      // Get data from localStorage
      const todosData = localStorage.getItem(storageKey);
      if (!todosData) return;

      const todos = JSON.parse(todosData);
      if (!Array.isArray(todos)) return;

      // Find the list title by storage key
      const todoListsMetadata = await this.getAllTodoListsWithMetadata(user);
      const listEntry = Object.values(todoListsMetadata).find(list => list.storageKey === storageKey);
      
      if (listEntry) {
        // Convert plain todos to TodoItems with proper structure
        const todoItems: TodoItem[] = todos.map((todo, index) => ({
          id: todo.id || `${Date.now()}_${index}`,
          text: todo.text || '',
          completed: todo.completed || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await this.saveTodoListToFirestore(user, listEntry.title, storageKey, todoItems, passphrase);
      }
    } catch (error) {
      console.error(`Error syncing localStorage change for ${storageKey}:`, error);
    }
  }

  async syncIndexedDBStorageChange(user: User, storageKey: string, passphrase: string = ''): Promise<void> {
    if (!user) return;

    try {
      // Get data from IndexedDB
      const todosData = await indexedDBStorage.getItem(storageKey);
      if (!todosData) return;

      const todos = JSON.parse(todosData);
      if (!Array.isArray(todos)) return;

      // Find the list title by storage key
      const todoListsMetadata = await this.getAllTodoListsWithMetadata(user);
      const listEntry = Object.values(todoListsMetadata).find(list => list.storageKey === storageKey);
      
      if (listEntry) {
        // Convert plain todos to TodoItems with proper structure
        const todoItems: TodoItem[] = todos.map((todo, index) => ({
          id: todo.id || `${Date.now()}_${index}`,
          text: todo.text || '',
          completed: todo.completed || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await this.saveTodoListToFirestore(user, listEntry.title, storageKey, todoItems, passphrase);
      }
    } catch (error) {
      console.error(`Error syncing IndexedDB change for ${storageKey}:`, error);
    }
  }

  async syncAllLocalDataToFirestore(user: User): Promise<void> {
    if (!user) return;
    
    const defaultStorageKeys = ['todos1', 'todos2', 'todos3', 'todos4', 'todos5', 'todos6'];
    const defaultTitles = ['main', 'admin', 'study', 'work', 'project', 'hobby'];
    
    try {
      for (let i = 0; i < defaultStorageKeys.length; i++) {
        const storageKey = defaultStorageKeys[i];
        const title = defaultTitles[i];
        
        // Get data from localStorage
        const todosData = localStorage.getItem(storageKey);
        const todos = todosData ? JSON.parse(todosData) : [];
        
        if (Array.isArray(todos)) {
          // Convert to proper TodoItems
          const todoItems: TodoItem[] = todos.map((todo, index) => ({
            id: todo.id || `${Date.now()}_${index}`,
            text: todo.text || '',
            completed: todo.completed || false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          await this.createTodoList(user, title, storageKey, todoItems);
        }
      }
      
      console.log("All local data synced to Firestore");
    } catch (error) {
      console.error("Error syncing all local data to Firestore:", error);
      throw error;
    }
  }

  async resetAllData(user: User): Promise<void> {
    if (!user) return;

    try {
      const todoListsRef = collection(db, "users", user.uid, "todoLists");
      const querySnapshot = await getDocs(todoListsRef);

      const deletePromises: Promise<void>[] = [];
      querySnapshot.forEach((docSnap) => {
        deletePromises.push(deleteDoc(docSnap.ref));
      });

      await Promise.all(deletePromises);
      console.log("All user data has been reset in Firestore.");
    } catch (error) {
      console.error("Error resetting user data in Firestore:", error);
      throw error;
    }
  }

  cleanup(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }
}

export const firestoreService = new FirestoreService();
