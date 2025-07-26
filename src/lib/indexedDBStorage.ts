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
  private db: IDBDatabase | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;

  private async openDB(): Promise<IDBDatabase> {
    // If we already have a valid connection, return it
    if (this.db && !this.db.objectStoreNames.contains('__closed__')) {
      this.resetConnectionTimer();
      return this.db;
    }

    // If there's already a connection promise in progress, wait for it
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      console.log('🔍 Opening IndexedDB:', this.dbName, 'version:', this.version);
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('❌ IndexedDB open error:', request.error);
        this.dbPromise = null;
        this.db = null;
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        console.log('✅ IndexedDB opened successfully. Object stores:', Array.from(db.objectStoreNames));
        
        // Verify the object store exists
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.error('❌ Object store not found:', this.storeName);
          db.close();
          this.dbPromise = null;
          this.db = null;
          reject(new Error(`Object store '${this.storeName}' not found`));
          return;
        }
        
        // Store the database connection
        this.db = db;
        this.resetConnectionTimer();
        
        // Handle unexpected closes
        db.onclose = () => {
          console.log('🔌 IndexedDB connection closed');
          this.db = null;
          this.dbPromise = null;
        };
        
        db.onerror = (event) => {
          console.error('❌ IndexedDB connection error:', event);
          this.db = null;
          this.dbPromise = null;
        };
        
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('🔄 IndexedDB upgrade needed');
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Clear any existing object stores first
        const existingStoreNames = Array.from(db.objectStoreNames);
        existingStoreNames.forEach(storeName => {
          console.log('🗑️ Deleting existing object store:', storeName);
          db.deleteObjectStore(storeName);
        });
        
        // Create the object store with the correct structure
        console.log('📦 Creating object store:', this.storeName);
        const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('✅ Object store created successfully');
      };

      request.onblocked = () => {
        console.warn('⚠️ IndexedDB upgrade blocked');
      };
    });

    return this.dbPromise;
  }

  // Reset the connection timer to keep the database open
  private resetConnectionTimer(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    // Close the connection after 30 seconds of inactivity
    this.connectionTimeout = setTimeout(() => {
      if (this.db) {
        console.log('⏰ Closing IndexedDB connection due to inactivity');
        this.db.close();
        this.db = null;
        this.dbPromise = null;
      }
    }, 30000);
  }

  // Force close the database connection
  private closeConnection(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    this.dbPromise = null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;
    
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          key,
          value,
          timestamp: Date.now()
        });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Don't close the database - let the timer handle it
      
      // Dispatch a custom event to notify components of the change
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent('indexeddb-storage', { 
          detail: { key, value, type: 'setItem' }
        }));
      }
    } catch (error) {
      console.error('IndexedDB setItem error:', error);
      // Reset the database connection to force reconnection
      this.closeConnection();
      // Fallback to localStorage if IndexedDB fails
      if (typeof window !== "undefined" && window.localStorage) {
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
      
      // Don't close the database - let the timer handle it
      
      return result ? result.value : null;
    } catch (error) {
      console.error('IndexedDB getItem error:', error);
      // Reset the database connection to force reconnection
      this.closeConnection();
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
      
      // Don't close the database - let the timer handle it
      
      // Dispatch a custom event to notify components of the change
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent('indexeddb-storage', { 
          detail: { key, type: 'removeItem' }
        }));
      }
    } catch (error) {
      console.error('IndexedDB removeItem error:', error);
      // Reset the database connection to force reconnection
      this.closeConnection();
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
      
      // Don't close the database - let the timer handle it
      
      return keys;
    } catch (error) {
      console.error('IndexedDB getAllKeys error:', error);
      // Reset the database connection to force reconnection
      this.closeConnection();
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
      
      // Don't close the database - let the timer handle it
      
      const result: Record<string, string> = {};
      items.forEach(item => {
        result[item.key] = item.value;
      });
      
      return result;
    } catch (error) {
      console.error('IndexedDB getAllItems error:', error);
      // Reset the database connection to force reconnection
      this.closeConnection();
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
      
      // Don't close the database - let the timer handle it
      
      // Dispatch a custom event to notify components of the change
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent('indexeddb-storage', { 
          detail: { type: 'clear' }
        }));
      }
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      // Reset the database connection to force reconnection
      this.closeConnection();
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
      
      // Don't close the database - let the timer handle it
      
      return count;
    } catch (error) {
      console.error('IndexedDB length error:', error);
      // Reset the database connection to force reconnection
      this.closeConnection();
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
      // Reset database connection on migration error
      this.closeConnection();
    }
  }

  // Method to reset the database connection (useful for debugging)
  resetConnection(): void {
    this.closeConnection();
    console.log('🔄 IndexedDB connection reset');
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
