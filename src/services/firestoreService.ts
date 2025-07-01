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

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoList {
  title: string;
  storageKey: string;
  todos: TodoItem[];
  lastModified: Date;
}

class FirestoreService {
  private listeners: Map<string, () => void> = new Map();

  // Sync all local data to Firestore
  async syncAllLocalDataToFirestore(user: User): Promise<void> {
    if (!user) return;

    try {
      // Get all existing todo lists from Firestore to maintain their storage keys
      const todoListsRef = collection(db, "users", user.uid, "todoLists");
      const querySnapshot = await getDocs(todoListsRef);

      // Iterate through existing Firestore documents
      querySnapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.storageKey) {
          const localData = localStorage.getItem(data.storageKey);
          if (localData) {
            const todos = JSON.parse(localData);
            await this.saveTodoListToFirestore(
              user,
              data.title,
              data.storageKey,
              todos
            );
          }
        }
      });

      console.log("All local data synced to Firestore");
    } catch (error) {
      console.error("Error syncing all local data to Firestore:", error);
      throw error;
    }
  }

  // Save a specific todo list to Firestore
  async saveTodoListToFirestore(
    user: User,
    listTitle: string,
    storageKey: string,
    todos: TodoItem[]
  ): Promise<void> {
    if (!user) return;

    try {
      // Use storageKey as the document ID
      const listDocRef = doc(db, "users", user.uid, "todoLists", storageKey);
      await setDoc(listDocRef, {
        title: listTitle,
        storageKey: storageKey,
        todos: todos,
        lastModified: Timestamp.now(),
      }, { merge: true });

      console.log(`Todo list '${listTitle}' saved to Firestore with document ID: ${storageKey}`);
    } catch (error) {
      console.error(
        `Error saving todo list '${listTitle}' to Firestore:`,
        error
      );
      throw error;
    }
  }

  // Load all todo lists from Firestore
  async loadAllTodoListsFromFirestore(user: User): Promise<void> {
    if (!user) return;

    try {
      const todoListsRef = collection(db, "users", user.uid, "todoLists");
      const querySnapshot = await getDocs(todoListsRef);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Use the stored storageKey from Firestore
        const storageKey = data.storageKey;

        if (storageKey && data.todos) {
          localStorage.setItem(storageKey, JSON.stringify(data.todos));
        }
      });

      // Dispatch a custom event to notify components that data has been loaded
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("firestore-data-loaded"));
      }

      console.log("All todo lists loaded from Firestore");
    } catch (error) {
      console.error("Error loading todo lists from Firestore:", error);
      throw error;
    }
  }

  // Load a specific todo list from Firestore
  async loadTodoListFromFirestore(
    user: User,
    listTitle: string
  ): Promise<{ todos: TodoItem[]; storageKey?: string } | null> {
    if (!user) return null;

    try {
      // For backward compatibility, we need to find the document by searching through all documents
      // since we only have the title but need the storageKey (which is now the document ID)
      const todoListsRef = collection(db, "users", user.uid, "todoLists");
      const querySnapshot = await getDocs(todoListsRef);

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        if (data.title === listTitle) {
          return {
            todos: data.todos || [],
            storageKey: data.storageKey,
          };
        }
      }

      console.log(`No todo list found for '${listTitle}'`);
      return null;
    } catch (error) {
      console.error(
        `Error loading todo list '${listTitle}' from Firestore:`,
        error
      );
      throw error;
    }
  }

  // Load a specific todo list from Firestore by storageKey (efficient direct lookup)
  async loadTodoListByStorageKey(
    user: User,
    storageKey: string
  ): Promise<{ todos: TodoItem[]; title?: string } | null> {
    if (!user) return null;

    try {
      // Direct lookup using storageKey as document ID
      const listDocRef = doc(db, "users", user.uid, "todoLists", storageKey);
      const docSnap = await getDoc(listDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          todos: data.todos || [],
          title: data.title,
        };
      }

      console.log(`No todo list found for storage key '${storageKey}'`);
      return null;
    } catch (error) {
      console.error(
        `Error loading todo list by storage key '${storageKey}' from Firestore:`,
        error
      );
      throw error;
    }
  }

  // Delete a todo list from Firestore
  async deleteTodoListFromFirestore(
    user: User,
    storageKey: string
  ): Promise<void> {
    if (!user) return;

    try {
      // Use storageKey as the document ID for direct deletion
      const listDocRef = doc(db, "users", user.uid, "todoLists", storageKey);
      await deleteDoc(listDocRef);
      console.log(`Todo list deleted from Firestore (document ID: ${storageKey})`);
    } catch (error) {
      console.error(`Error deleting todo list from Firestore:`, error);
      throw error;
    }
  }

  // Set up real-time listener for a user's todo lists
  subscribeToUserTodoLists(
    user: User,
    callback: (
      lists: Record<string, { todos: TodoItem[]; storageKey: string }>
    ) => void
  ): () => void {
    if (!user) return () => {};

    const todoListsRef = collection(db, "users", user.uid, "todoLists");

    const unsubscribe = onSnapshot(todoListsRef, (querySnapshot) => {
      const lists: Record<string, { todos: TodoItem[]; storageKey: string }> =
        {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const storageKey = data.storageKey;
        lists[data.title] = {
          todos: data.todos || [],
          storageKey: storageKey,
        };
      });

      callback(lists);
    });

    return unsubscribe;
  }

  // Sync local storage changes to Firestore automatically
  async syncLocalStorageChange(user: User, storageKey: string): Promise<void> {
    if (!user) return;

    try {
      // First try to get the existing document to find the title
      const listDocRef = doc(db, "users", user.uid, "todoLists", storageKey);
      const docSnap = await getDoc(listDocRef);
      
      let listTitle = storageKey; // fallback to storageKey if no title found
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        listTitle = data.title || storageKey;
      }

      const localData = localStorage.getItem(storageKey);
      if (localData) {
        const todos = JSON.parse(localData);
        await this.saveTodoListToFirestore(user, listTitle, storageKey, todos);
      }
    } catch (error) {
      console.error("Error syncing local storage change:", error);
      throw error;
    }
  }

  // Create a new todo list (useful for dynamic creation)
  async createTodoList(
    user: User,
    title: string,
    storageKey: string,
    todos: TodoItem[] = []
  ): Promise<void> {
    if (!user) return;

    try {
      await this.saveTodoListToFirestore(user, title, storageKey, todos);
      localStorage.setItem(storageKey, JSON.stringify(todos));
      console.log(
        `New todo list '${title}' created with storage key '${storageKey}'`
      );
    } catch (error) {
      console.error(`Error creating todo list '${title}':`, error);
      throw error;
    }
  }

  // Get all todo lists with their metadata
  async getAllTodoListsWithMetadata(
    user: User
  ): Promise<Record<string, TodoList>> {
    if (!user) return {};

    try {
      const todoListsRef = collection(db, "users", user.uid, "todoLists");
      const querySnapshot = await getDocs(todoListsRef);
      const lists: Record<string, TodoList> = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const storageKey = data.storageKey;

        lists[data.title] = {
          title: data.title,
          storageKey: storageKey,
          todos: data.todos || [],
          lastModified: data.lastModified?.toDate() || new Date(),
        };
      });

      return lists;
    } catch (error) {
      console.error("Error getting all todo lists with metadata:", error);
      throw error;
    }
  }

  // Clean up all listeners
  cleanup(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }
}

// Export a singleton instance
export const firestoreService = new FirestoreService();
