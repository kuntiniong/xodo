// IndexedDB storage utility to replace localStorage
export interface StorageItem {
  key: string;
  value: string;
  timestamp: number;
}

class IndexedDBStorage {
  private dbName = 'TodoAppStorage';
  private version = 2;
  private storeName = 'storage';
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    // If there's already a connection promise in progress, reuse it
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('❌ IndexedDB error:', request.error);
        this.dbPromise = null;
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        
        // Verify the object store exists
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.error('❌ Object store not found:', this.storeName);
          db.close();
          this.dbPromise = null;
          reject(new Error(`Object store '${this.storeName}' not found`));
          return;
        }
        
        // Clear promise on unexpected close so we reconnect next time
        db.onclose = () => {
          this.dbPromise = null;
        };
        
        db.onerror = () => {
          this.dbPromise = null;
        };
        
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Clear any existing object stores
        Array.from(db.objectStoreNames).forEach(name => {
          db.deleteObjectStore(name);
        });
        
        // Create the object store
        const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      };
    });

    return this.dbPromise;
  }

  // Force close and reset connection (for error recovery)
  private resetConnection(): void {
    if (this.dbPromise) {
      this.dbPromise.then(db => db.close()).catch(() => {});
      this.dbPromise = null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;
    
    try {
      if (!value) {
        console.warn(`⚠️ Warning: setItem called with empty value for key: ${key}`);
      }
      
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          key,
          value,
          timestamp: Date.now()
        });
        
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
      
      // Dispatch a custom event to notify components of the change
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent('indexeddb-storage', { 
          detail: { key, value, type: 'setItem' }
        }));
      }
    } catch (error) {
      console.error('❌ IndexedDB setItem error:', error);
      this.resetConnection();
      // Fallback to localStorage if IndexedDB fails
      if (typeof window !== "undefined" && window.localStorage) {
        console.log(`📝 Falling back to localStorage for key: ${key}`);
        window.localStorage.setItem(key, value);
      }
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (typeof window === "undefined") return null;
    
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const result = await new Promise<StorageItem | undefined>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      return result ? result.value : null;
    } catch (error) {
      console.error('IndexedDB getItem error:', error);
      this.resetConnection();
      // Fallback to localStorage if IndexedDB fails
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === "undefined") return;
    
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Dispatch a custom event to notify components of the change
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent('indexeddb-storage', { 
          detail: { key, type: 'removeItem' }
        }));
      }
    } catch (error) {
      console.error('IndexedDB removeItem error:', error);
      this.resetConnection();
      // Fallback to localStorage if IndexedDB fails
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    }
  }

  async getAllKeys(): Promise<string[]> {
    if (typeof window === "undefined") return [];
    
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const keys = await new Promise<string[]>((resolve, reject) => {
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result as string[]);
        request.onerror = () => reject(request.error);
      });
      
      return keys;
    } catch (error) {
      console.error('IndexedDB getAllKeys error:', error);
      this.resetConnection();
      // Fallback to localStorage if IndexedDB fails
      if (typeof window !== "undefined" && window.localStorage) {
        return Object.keys(window.localStorage);
      }
      return [];
    }
  }

  async getAllItems(): Promise<Record<string, string>> {
    if (typeof window === "undefined") return {};
    
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const items = await new Promise<StorageItem[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const result: Record<string, string> = {};
      items.forEach(item => {
        result[item.key] = item.value;
      });
      
      return result;
    } catch (error) {
      console.error('IndexedDB getAllItems error:', error);
      this.resetConnection();
      // Fallback to localStorage if IndexedDB fails
      if (typeof window !== "undefined" && window.localStorage) {
        const result: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            result[key] = window.localStorage.getItem(key) || '';
          }
        }
        return result;
      }
      return {};
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Dispatch a custom event to notify components of the change
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent('indexeddb-storage', { 
          detail: { type: 'clear' }
        }));
      }
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      this.resetConnection();
      // Fallback to localStorage if IndexedDB fails
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
    }
  }

  // Get the number of items in storage
  async length(): Promise<number> {
    if (typeof window === "undefined") return 0;
    
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const count = await new Promise<number>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      return count;
    } catch (error) {
      console.error('IndexedDB length error:', error);
      this.resetConnection();
      // Fallback to localStorage if IndexedDB fails
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.length;
      }
      return 0;
    }
  }

  // Get key at specific index (for compatibility with localStorage)
  async key(index: number): Promise<string | null> {
    if (typeof window === "undefined") return null;
    
    try {
      const keys = await this.getAllKeys();
      return index >= 0 && index < keys.length ? keys[index] : null;
    } catch (error) {
      console.error('IndexedDB key error:', error);
      // Fallback to localStorage if IndexedDB fails
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.key(index);
      }
      return null;
    }
  }

  // Method to migrate existing localStorage data to IndexedDB
  async migrateFromLocalStorage(): Promise<void> {
    if (typeof window === "undefined" || !window.localStorage) return;
    
    console.log('🔄 Starting migration from localStorage to IndexedDB...');
    
    try {
      const localStorageData: Record<string, string> = {};
      
      // Get all localStorage data (excluding migration marker)
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key !== 'indexeddb-migration-completed') {
          const value = window.localStorage.getItem(key);
          if (value !== null) {
            localStorageData[key] = value;
          }
        }
      }
      
      // Only migrate if there's data to migrate
      if (Object.keys(localStorageData).length > 0) {
        // Store all data in IndexedDB
        for (const [key, value] of Object.entries(localStorageData)) {
          await this.setItem(key, value);
        }
        
        console.log(`✅ Migrated ${Object.keys(localStorageData).length} items from localStorage to IndexedDB`);
      } else {
        console.log('ℹ️ No localStorage data to migrate');
      }
    } catch (error) {
      console.error('❌ Error migrating from localStorage to IndexedDB:', error);
      this.resetConnection();
    }
  }
}

// Create and export singleton instance
export const indexedDBStorage = new IndexedDBStorage();

// Auto-migration on first load (only once)
if (typeof window !== 'undefined') {
  const migrationKey = 'indexeddb-migration-completed';
  
  // Check if migration has already been completed
  if (window.localStorage.getItem(migrationKey) === null) {
    // Wait a bit for the page to load before migrating
    setTimeout(() => {
      indexedDBStorage.migrateFromLocalStorage().then(() => {
        // Mark migration as completed
        window.localStorage.setItem(migrationKey, 'true');
      }).catch((error) => {
        console.error('Migration failed:', error);
        // Don't mark as completed if migration failed
      });
    }, 100);
  }
}
