// In-memory cache for decrypted AES keys
// CK is kept only in memory and discarded on refresh

class KeyCache {
  private cache = new Map<string, CryptoKey>(); // In-memory fallback for immediate access
  async setDecryptedKey(userId: string, decryptedKey: CryptoKey): Promise<void> {
    // Store in memory for immediate access
    this.cache.set(userId, decryptedKey);
    console.log(`AES key stored in memory cache for user ${userId}`);
  }

  // New method to store raw key material alongside the CryptoKey for persistence
  async setDecryptedKeyWithMaterial(userId: string, decryptedKey: CryptoKey, keyMaterial: Uint8Array): Promise<void> {
    // Store in memory only (no persistence)
    this.cache.set(userId, decryptedKey);
  }

  async getDecryptedKey(userId: string): Promise<CryptoKey | null> {
    // First check in-memory cache (silent - this is called frequently)
    if (this.cache.has(userId)) {
      const key = this.cache.get(userId);
      return key || null;
    }
    return null;
  }

  async clearKey(userId: string): Promise<void> {
    this.cache.delete(userId);
    console.log(`Cleared cached key for user ${userId}`);
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
    console.log('Cleared all cached keys');
  }

  async hasKey(userId: string): Promise<boolean> {
    // Check in-memory first
    if (this.cache.has(userId)) {
      return true;
    }
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

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    keyCache.clearMemoryCache();
  });

  window.addEventListener('unload', () => {
    keyCache.clearMemoryCache();
  });
}
