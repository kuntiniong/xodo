"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTodoStore } from '@/stores/todoStore';
import { firestoreService } from '@/services/firestoreService';
import { indexedDBStorage } from '@/lib/indexedDBStorage';

// Track the last synced data hash to avoid redundant writes
let lastSyncedDataHash = '';
const hashTodoLists = (todoLists: Record<string, any>) => JSON.stringify(todoLists);

// Hook to sync Zustand store changes to Firestore for LOGGED-IN users
// For ANONYMOUS users: This hook does nothing, IndexedDB is used separately
export const useFirestoreSync = () => {
  const { user } = useAuthStore();
  const [previousUserUid, setPreviousUserUid] = useState<string | null>(null);

  // Default template storage keys (only for anonymous users)
  const defaultStorageKeys = ['todos1', 'todos2', 'todos3', 'todos4', 'todos5', 'todos6'];

  // Handle logout: reset to default template in IndexedDB for anonymous
  useEffect(() => {
    const currentUserUid = user?.uid || null;

    if (previousUserUid && !currentUserUid) {
      // User logged out, reset anonymous IndexedDB to default template
      console.log('🔄 User logged out, resetting anonymous IndexedDB to default template');
      const resetAnonymousStorage = async () => {
        for (const key of defaultStorageKeys) {
          await indexedDBStorage.removeItem(key);
        }
      };
      resetAnonymousStorage();
    }

    setPreviousUserUid(currentUserUid);
  }, [user?.uid, previousUserUid]);

  // ONLY for logged-in users: subscribe to Zustand store changes explicitly
  useEffect(() => {
    if (!user) return; // Skip for anonymous users

    let timeoutId: NodeJS.Timeout | undefined;

    const unsubscribe = useTodoStore.subscribe((state) => {
      const todoLists = state.todoLists;
      const hash = hashTodoLists(todoLists);
      if (hash === lastSyncedDataHash) return; // no change

      const syncToFirestore = async () => {
        try {
          for (const [listTitle, todoList] of Object.entries(todoLists)) {
            await firestoreService.syncTodoListToFirestore(user, listTitle, todoList as any);
          }
          lastSyncedDataHash = hash;
        } catch (error) {
          console.error('Error syncing todo lists to Firestore:', error);
        }
      };

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(syncToFirestore, 500);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user]);
};


// Hook to reset all data in Firestore and IndexedDB storage
export const useResetAllData = () => {
  const { user } = useAuthStore();

  const resetAllData = async () => {
    if (!user) {
      console.error("User not logged in. Cannot reset data.");
      return;
    }
    try {
      await firestoreService.resetAllData(user);

      // For anonymous users, also clear IndexedDB
      const defaultStorageKeys = ['todos1', 'todos2', 'todos3', 'todos4', 'todos5', 'todos6'];
      for (const key of defaultStorageKeys) {
        await indexedDBStorage.removeItem(key);
      }

      console.log('✅ All data reset successfully');
    } catch (error) {
      console.error('Error resetting all data:', error);
    }
  };

  return { resetAllData };
};
