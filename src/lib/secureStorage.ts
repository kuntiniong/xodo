// Secure key storage using IndexedDB for better XSS protection
import { indexedDBStorage } from './indexedDBStorage';

class SecureKeyStorage {
  private dbName = 'TodoAppSecureStorage';
  private version = 1;
  private storeName = 'keys';
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
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        this.dbPromise = null;
        this.db = null;
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        this.db = db;
        this.resetConnectionTimer();
        
        // Handle unexpected closes
        db.onclose = () => {
          this.db = null;
          this.dbPromise = null;
        };
        
        db.onerror = () => {
          this.db = null;
          this.dbPromise = null;
        };
        
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
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

  async storePrivateKey(userId: string, privateKeyArmored: string, passphrase: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: `privateKey_${userId}`,
        privateKeyArmored,
        passphrase,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Don't close the database - let the timer handle it
  }

  async getPrivateKey(userId: string): Promise<{privateKeyArmored: string; passphrase: string} | null> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    const result = await new Promise<any>((resolve, reject) => {
      const request = store.get(`privateKey_${userId}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Don't close the database - let the timer handle it
    
    if (result) {
      return {
        privateKeyArmored: result.privateKeyArmored,
        passphrase: result.passphrase
      };
    }
    
    return null;
  }

  async clearPrivateKey(userId: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(`privateKey_${userId}`);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Don't close the database - let the timer handle it
  }

  async clearAllKeys(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Don't close the database - let the timer handle it
  }
}

export const secureKeyStorage = new SecureKeyStorage();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Clear keys when user closes tab/browser
    // Note: This is best effort - not guaranteed to execute
    navigator.sendBeacon('/api/cleanup-session');
  });

  window.addEventListener('unload', () => {
    secureKeyStorage.clearAllKeys();
  });
}
