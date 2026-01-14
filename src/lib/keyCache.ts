// Persistent cache for decrypted AES keys using IndexedDB
// This avoids having to decrypt the key on every operation
// and eliminates the need to store passphrases
// Keys persist across page refreshes and browser sessions

import { indexedDBStorage } from './indexedDBStorage';

class KeyCache {
  private cache = new Map<string, CryptoKey>(); // In-memory fallback for immediate access
  private readonly KEY_PREFIX = 'decrypted_key_';

  async setDecryptedKey(userId: string, decryptedKey: CryptoKey): Promise<void> {
    // Store in memory for immediate access
    this.cache.set(userId, decryptedKey);
    
    // We can't persist CryptoKey objects directly due to extractable restrictions
    // The crypto module will need to call setDecryptedKeyWithMaterial instead
    console.log(`AES key stored in memory cache for user ${userId}`);
  }

  // New method to store raw key material alongside the CryptoKey for persistence
  async setDecryptedKeyWithMaterial(userId: string, decryptedKey: CryptoKey, keyMaterial: Uint8Array): Promise<void> {
    // Store in memory for immediate access
    this.cache.set(userId, decryptedKey);
    
    // Persist raw key material to IndexedDB for page refresh survival
    try {
      const keyArray = Array.from(keyMaterial);
      const keyData = JSON.stringify({
        userId,
        keyArray: keyArray,
        timestamp: Date.now(),
        algorithm: 'AES-GCM'
      });
      
      const storageKey = `${this.KEY_PREFIX}${userId}`;
      await indexedDBStorage.setItem(storageKey, keyData);
      
    } catch (error) {
      console.error('❌ Failed to cache decrypted key to IndexedDB:', error);
      throw error;
    }
  }

  async getDecryptedKey(userId: string): Promise<CryptoKey | null> {
    // First check in-memory cache (silent - this is called frequently)
    if (this.cache.has(userId)) {
      const key = this.cache.get(userId);
      return key || null;
    }

    // If not in memory, try to load from IndexedDB
    try {
      const storageKey = `${this.KEY_PREFIX}${userId}`;
      const keyData = await indexedDBStorage.getItem(storageKey);
      
      if (keyData) {
        const parsed = JSON.parse(keyData);
        
        // Import the AES key from stored array
        if (parsed.algorithm === 'AES-GCM' && parsed.keyArray) {
          const keyArray = new Uint8Array(parsed.keyArray);
          const aesKey = await crypto.subtle.importKey(
            'raw',
            keyArray.buffer as ArrayBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
          );
          
          // Store back in memory cache for faster access
          this.cache.set(userId, aesKey);
          return aesKey;
        }
      }
    } catch (error) {
      console.error(`❌ Error retrieving key from IndexedDB:`, error);
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
export async function cacheDecryptedPrivateKey(userId: string, keyData: string, passphrase: string): Promise<void> {
  // This function is now a wrapper that generates an AES key from the passphrase
  // Import the AES encryption functions
  const { generateDeterministicKeyMaterial } = await import('./crypto');
  const keyMaterial = await generateDeterministicKeyMaterial(userId, passphrase);
  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  await keyCache.setDecryptedKeyWithMaterial(userId, aesKey, keyMaterial);
}
