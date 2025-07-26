"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { firestoreService } from '@/services/firestoreService';

// Hook to automatically sync localStorage changes to Firestore
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

    // Function to handle storage changes
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key && storageKeysToSync.includes(e.key)) {
        try {
          await firestoreService.syncLocalStorageChange(user, e.key);
        } catch (error) {
          console.error('Error syncing storage change to Firestore:', error);
        }
      }
    };

    // Listen for storage events (changes from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also create a mutation observer to watch for direct localStorage changes
    let timeoutId: NodeJS.Timeout;
    const debouncedSync = (storageKey: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const { publicKey } = useAuthStore.getState();
        if (!publicKey) {
          console.warn(`Sync for ${storageKey} skipped: Public key not available yet.`);
          return;
        }
        try {
          console.log(`🔄 Syncing ${storageKey} to Firestore after 1s debounce`);
          await firestoreService.syncLocalStorageChange(user, storageKey);
          console.log(`✅ Successfully synced ${storageKey} to Firestore`);
        } catch (error) {
          console.error(`❌ Error syncing ${storageKey} to Firestore:`, error);
        }
      }, 1000); // Debounce for 1 second
    };

    // Override localStorage setItem to trigger sync
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (storageKeysToSync.includes(key)) {
        console.log(`📝 localStorage change detected for ${key}, scheduling Firestore sync`);
        debouncedSync(key);
      }
    };

    // Cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      localStorage.setItem = originalSetItem;
      clearTimeout(timeoutId);
    };
  }, [user, storageKeysToSync]);
};

// Hook to listen for Firestore updates and update localStorage
export const useFirestoreListener = () => {
  const { user } = useAuthStore();
  const [previousUserUid, setPreviousUserUid] = useState<string | null>(null);

  // Clear custom localStorage data when user logs out
  useEffect(() => {
    const currentUserUid = user?.uid || null;
    
    console.log('Auth state changed in listener:', { previousUserUid, currentUserUid });
    
    if (previousUserUid && !currentUserUid) {
      // User logged out, clear ALL todo-related localStorage data
      console.log('🧹 User logged out detected, clearing all todo localStorage data');
      
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      console.log('All localStorage keys before cleanup:', allKeys);
      
      // Remove ALL todo-related localStorage keys (including default template)
      allKeys.forEach(key => {
        if (key.startsWith('todos')) {
          console.log(`🗑️ Removing storage key: ${key}`);
          localStorage.removeItem(key);
        }
      });
      
      console.log('All localStorage keys after cleanup:', Object.keys(localStorage));
      
      // Dispatch event to notify components that data has been reset
      window.dispatchEvent(new CustomEvent('user-logout-reset'));
      console.log('📢 Dispatched user-logout-reset event');
    }
    
    setPreviousUserUid(currentUserUid);
  }, [user?.uid, previousUserUid]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time updates from Firestore
    const unsubscribe = firestoreService.subscribeToUserTodoLists(user, (lists) => {
      // Update localStorage with Firestore data using the storageKey from Firestore
      Object.entries(lists).forEach(([title, { todos, storageKey }]) => {
        if (storageKey) {
          const currentData = localStorage.getItem(storageKey);
          const todosForStorage = todos.map(todo => ({
            text: todo.text,
            completed: todo.completed
          }));
          const newData = JSON.stringify(todosForStorage);
          
          // Only update if data has changed to avoid infinite loops
          if (currentData !== newData) {
            localStorage.setItem(storageKey, newData);
            // Dispatch event to notify components of the change
            window.dispatchEvent(new CustomEvent('firestore-sync-update', { 
              detail: { storageKey, title, todos: todosForStorage } 
            }));
          }
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user]);
};

// Hook to reset all data in Firestore and local storage
export const useResetAllData = () => {
  const { user } = useAuthStore();

  const resetAllData = async () => {
    if (!user) {
      console.error("User not logged in. Cannot reset data.");
      return;
    }
    try {
      await firestoreService.resetAllData(user);

      // Clear all todo-related localStorage
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key.startsWith("todos")) {
          localStorage.removeItem(key);
        }
      });

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
