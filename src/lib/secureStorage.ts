// Secure key storage using IndexedDB for better XSS protection
class SecureKeyStorage {
  private dbName = 'TodoAppSecureStorage';
  private version = 1;
  private storeName = 'keys';

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async storePrivateKey(userId: string, privateKey: string, passphrase: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: `privateKey_${userId}`,
        privateKey,
        passphrase,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  }

  async getPrivateKey(userId: string): Promise<{privateKey: string; passphrase: string} | null> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    const result = await new Promise<any>((resolve, reject) => {
      const request = store.get(`privateKey_${userId}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    
    if (result) {
      return {
        privateKey: result.privateKey,
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
    
    db.close();
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
    
    db.close();
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
