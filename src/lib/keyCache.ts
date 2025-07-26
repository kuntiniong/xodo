// Persistent cache for decrypted OpenPGP private keys using IndexedDB
// This avoids having to decrypt the private key on every operation
// and eliminates the need to store passphrases
// Keys persist across page refreshes and browser sessions

import { indexedDBStorage } from './indexedDBStorage';
import * as openpgp from 'openpgp';

class KeyCache {
  private cache = new Map<string, any>(); // In-memory fallback for immediate access
  private readonly KEY_PREFIX = 'decrypted_key_';

  async setDecryptedKey(userId: string, decryptedPrivateKey: any): Promise<void> {
    // Store in memory for immediate access
    this.cache.set(userId, decryptedPrivateKey);
    
    // Persist to IndexedDB for page refresh survival
    try {
      const keyData = JSON.stringify({
        userId,
        decryptedPrivateKey: decryptedPrivateKey.armor(), // Serialize the OpenPGP key
        timestamp: Date.now()
      });
      await indexedDBStorage.setItem(`${this.KEY_PREFIX}${userId}`, keyData);
      console.log(`Decrypted key cached persistently for user ${userId}`);
    } catch (error) {
      console.error('Failed to cache decrypted key to IndexedDB:', error);
    }
  }

  async getDecryptedKey(userId: string): Promise<any | null> {
    // First check in-memory cache
    if (this.cache.has(userId)) {
      return this.cache.get(userId);
    }

    // If not in memory, try to load from IndexedDB
    try {
      const keyData = await indexedDBStorage.getItem(`${this.KEY_PREFIX}${userId}`);
      if (keyData) {
        const parsed = JSON.parse(keyData);
        
        // Deserialize the OpenPGP key using the correct function
        const privateKey = await openpgp.readPrivateKey({ armoredKey: parsed.decryptedPrivateKey });
        
        // Store back in memory cache for faster access
        this.cache.set(userId, privateKey);
        console.log(`Restored decrypted key from persistent cache for user ${userId}`);
        return privateKey;
      }
    } catch (error) {
      console.error('Failed to restore decrypted key from IndexedDB:', error);
    }

    return null;
  }

  async clearKey(userId: string): Promise<void> {
    this.cache.delete(userId);
    try {
      await indexedDBStorage.removeItem(`${this.KEY_PREFIX}${userId}`);
      console.log(`Cleared cached key for user ${userId}`);
    } catch (error) {
      console.error('Failed to clear cached key from IndexedDB:', error);
    }
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
    try {
      // Get all keys that start with our prefix and remove them
      const keys = await indexedDBStorage.getAllKeys();
      const keyPromises = keys
        .filter(key => key.startsWith(this.KEY_PREFIX))
        .map(key => indexedDBStorage.removeItem(key));
      await Promise.all(keyPromises);
      console.log('Cleared all cached keys');
    } catch (error) {
      console.error('Failed to clear all cached keys from IndexedDB:', error);
    }
  }

  async hasKey(userId: string): Promise<boolean> {
    // Check in-memory first
    if (this.cache.has(userId)) {
      return true;
    }

    // Check IndexedDB
    try {
      const keyData = await indexedDBStorage.getItem(`${this.KEY_PREFIX}${userId}`);
      return keyData !== null;
    } catch (error) {
      console.error('Failed to check for cached key in IndexedDB:', error);
      return false;
    }
  }

  // Synchronous version for compatibility with existing code
  hasSyncKey(userId: string): boolean {
    return this.cache.has(userId);
  }

  // Public method to clear in-memory cache
  clearMemoryCache(): void {
    this.cache.clear();
  }
}

export const keyCache = new KeyCache();

// Auto-cleanup on page unload (but keep IndexedDB data for next session)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Only clear in-memory cache, keep IndexedDB data
    keyCache.clearMemoryCache();
  });

  window.addEventListener('unload', () => {
    // Only clear in-memory cache, keep IndexedDB data  
    keyCache.clearMemoryCache();
  });
}

// Export helper functions for backward compatibility
export async function cacheDecryptedPrivateKey(userId: string, encryptedPrivateKey: string, passphrase: string): Promise<void> {
  const privateKey = await openpgp.readPrivateKey({ armoredKey: encryptedPrivateKey });
  const decryptedKey = await openpgp.decryptKey({
    privateKey,
    passphrase
  });
  await keyCache.setDecryptedKey(userId, decryptedKey);
}
