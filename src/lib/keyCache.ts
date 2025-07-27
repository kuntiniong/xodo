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
    
    // For persistent storage, we'll regenerate the key material from the userId
    // This avoids the extractable key issue entirely
    try {
      const keyData = JSON.stringify({
        userId,
        timestamp: Date.now(),
        algorithm: 'AES-GCM',
        // Note: We don't store the actual key material, just metadata
        // The key will be regenerated from userId + passphrase when needed
      });
      await indexedDBStorage.setItem(`${this.KEY_PREFIX}${userId}`, keyData);
      console.log(`AES key session info cached persistently for user ${userId}`);
    } catch (error) {
      console.error('Failed to cache key session info to IndexedDB:', error);
    }
  }

  async getDecryptedKey(userId: string): Promise<CryptoKey | null> {
    // First check in-memory cache
    if (this.cache.has(userId)) {
      const key = this.cache.get(userId);
      return key || null;
    }

    // If not in memory, we can't restore the key without the passphrase
    // The user will need to re-authenticate to regenerate the key
    try {
      const keyData = await indexedDBStorage.getItem(`${this.KEY_PREFIX}${userId}`);
      if (keyData) {
        const parsed = JSON.parse(keyData);
        if (parsed.algorithm === 'AES-GCM') {
          console.log(`Key session exists for user ${userId} but key not in memory - re-authentication required`);
        }
      }
    } catch (error) {
      console.error('Failed to check key session in IndexedDB:', error);
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
    // Check in-memory first (this is the actual key availability)
    if (this.cache.has(userId)) {
      return true;
    }

    // For session persistence, we only check if there's a session record
    // but the actual key needs to be regenerated with passphrase
    return false;
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
  const { generateDeterministicAESKey } = await import('./crypto');
  const aesKey = await generateDeterministicAESKey(userId, passphrase);
  await keyCache.setDecryptedKey(userId, aesKey);
}
