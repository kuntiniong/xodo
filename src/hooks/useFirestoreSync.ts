"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { firestoreService } from '@/services/firestoreService';
import { indexedDBStorage } from '@/lib/indexedDBStorage';

// Hook to automatically sync IndexedDB storage changes to Firestore
export const useFirestoreSync = () => {
  const { user } = useAuthStore();
  const [storageKeysToSync, setStorageKeysToSync] = useState<string[]>([]);
  const [previousUserUid, setPreviousUserUid] = useState<string | null>(null);

  // Default template storage keys
  const defaultStorageKeys = ['todos1', 'todos2', 'todos3', 'todos4', 'todos5', 'todos6'];

  // Reset to default storage keys when user logs out
  useEffect(() => {
    const currentUserUid = user?.uid || null;
    
    console.log('Auth state changed:', { previousUserUid, currentUserUid });
    
    if (previousUserUid && !currentUserUid) {
      // User logged out, reset to default template
      console.log('🔄 User logged out detected, resetting to default template storage keys');
      setStorageKeysToSync(defaultStorageKeys);
    }
    
    setPreviousUserUid(currentUserUid);
  }, [user?.uid, previousUserUid]);

  // Get storage keys dynamically from Firestore
  useEffect(() => {
    const loadStorageKeys = async () => {
      const { privateKey, passphrase } = useAuthStore.getState();
      if (!user || !privateKey || !passphrase) {
        // Default storage keys for anonymous users or when keys are not ready
        setStorageKeysToSync(defaultStorageKeys);
        return;
      }

      try {
        const todoListsMetadata = await firestoreService.getAllTodoListsWithMetadata(user);
        const keys = Object.values(todoListsMetadata).map(list => list.storageKey);
        setStorageKeysToSync(keys.length > 0 ? keys : defaultStorageKeys);
      } catch (error) {
        console.error('Error loading storage keys:', error);
        setStorageKeysToSync(defaultStorageKeys);
      }
    };

    loadStorageKeys();
  }, [user]);

  useEffect(() => {
    if (!user || storageKeysToSync.length === 0) return;

    // Function to handle IndexedDB storage changes
    const handleStorageChange = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { key } = customEvent.detail || {};
      if (key && storageKeysToSync.includes(key)) {
        try {
          await firestoreService.syncIndexedDBStorageChange(user, key);
        } catch (error) {
          console.error('Error syncing storage change to Firestore:', error);
        }
      }
    };

    // Listen for IndexedDB storage events
    window.addEventListener('indexeddb-storage', handleStorageChange);

    // Debounced sync for IndexedDB changes
    let timeoutId: NodeJS.Timeout;
    const debouncedSync = (storageKey: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const { privateKey, passphrase } = useAuthStore.getState();
        if (!privateKey || !passphrase) {
          console.warn(`Sync for ${storageKey} skipped: Private key or passphrase not available yet.`);
          return;
        }
        try {
          console.log(`🔄 Syncing ${storageKey} to Firestore after 1s debounce`);
          await firestoreService.syncIndexedDBStorageChange(user, storageKey);
          console.log(`✅ Successfully synced ${storageKey} to Firestore`);
        } catch (error) {
          console.error(`❌ Error syncing ${storageKey} to Firestore:`, error);
        }
      }, 1000); // Debounce for 1 second
    };

    // Set up a custom event listener for manual sync triggers
    const handleManualSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { key } = customEvent.detail || {};
      if (storageKeysToSync.includes(key)) {
        console.log(`📝 IndexedDB storage change detected for ${key}, scheduling Firestore sync`);
        debouncedSync(key);
      }
    };

    window.addEventListener('indexeddb-manual-sync', handleManualSync);

    // Cleanup function
    return () => {
      window.removeEventListener('indexeddb-storage', handleStorageChange);
      window.removeEventListener('indexeddb-manual-sync', handleManualSync);
      clearTimeout(timeoutId);
    };
  }, [user, storageKeysToSync]);
};

// Hook to listen for Firestore updates and update IndexedDB storage
export const useFirestoreListener = () => {
  const { user } = useAuthStore();
  const [previousUserUid, setPreviousUserUid] = useState<string | null>(null);

  // Clear custom IndexedDB storage data when user logs out
  useEffect(() => {
    const currentUserUid = user?.uid || null;
    
    console.log('Auth state changed in listener:', { previousUserUid, currentUserUid });
    
    if (previousUserUid && !currentUserUid) {
      // User logged out, clear ALL todo-related IndexedDB storage data
      console.log('🧹 User logged out detected, clearing all todo IndexedDB storage data');
      
      const clearStorageData = async () => {
        // Get all IndexedDB storage keys
        const allKeys = await indexedDBStorage.getAllKeys();
        console.log('All IndexedDB storage keys before cleanup:', allKeys);
        
        // Remove ALL todo-related storage keys (including default template)
        for (const key of allKeys) {
          if (key.startsWith('todos')) {
            console.log(`🗑️ Removing storage key: ${key}`);
            await indexedDBStorage.removeItem(key);
          }
        }
        
        const remainingKeys = await indexedDBStorage.getAllKeys();
        console.log('All IndexedDB storage keys after cleanup:', remainingKeys);
        
        // Dispatch event to notify components that data has been reset
        window.dispatchEvent(new CustomEvent('user-logout-reset'));
        console.log('📢 Dispatched user-logout-reset event');
      };
      
      clearStorageData();
    }
    
    setPreviousUserUid(currentUserUid);
  }, [user?.uid, previousUserUid]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time updates from Firestore
    const unsubscribe = firestoreService.subscribeToUserTodoLists(user, async (lists) => {
      // Update IndexedDB storage with Firestore data using the storageKey from Firestore
      for (const [title, { todos, storageKey }] of Object.entries(lists)) {
        if (storageKey) {
          const currentData = await indexedDBStorage.getItem(storageKey);
          const todosForStorage = todos.map(todo => ({
            text: todo.text,
            completed: todo.completed
          }));
          const newData = JSON.stringify(todosForStorage);
          
          // Only update if data has changed to avoid infinite loops
          if (currentData !== newData) {
            await indexedDBStorage.setItem(storageKey, newData);
            // Dispatch event to notify components of the change
            window.dispatchEvent(new CustomEvent('firestore-sync-update', { 
              detail: { storageKey, title, todos: todosForStorage } 
            }));
          }
        }
      }
    });

    return () => {
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

      // Clear all todo-related IndexedDB storage
      const allKeys = await indexedDBStorage.getAllKeys();
      for (const key of allKeys) {
        if (key.startsWith("todos")) {
          await indexedDBStorage.removeItem(key);
        }
      }

      // Dispatch event to notify components that data has been reset
      window.dispatchEvent(new CustomEvent("user-logout-reset"));
      console.log("All data reset successfully.");
    } catch (error) {
      console.error("Error resetting data:", error);
      throw error; // Re-throw for component-level error handling
    }
  };

  return { resetAllData };
};
