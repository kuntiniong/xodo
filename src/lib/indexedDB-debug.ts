// IndexedDB Debug Utilities
// Add this to browser console to debug IndexedDB issues

import { indexedDBStorage } from './indexedDBStorage';

// @ts-ignore
window.debugIndexedDB = {
  // Test the IndexedDB connection
  async testConnection() {
    try {
      console.log('🧪 Testing IndexedDB connection...');
      
      // Test basic operations
      await indexedDBStorage.setItem('test-key', 'test-value');
      const value = await indexedDBStorage.getItem('test-key');
      console.log('✅ Set/Get test:', value === 'test-value' ? 'PASSED' : 'FAILED');
      
      // Clean up
      await indexedDBStorage.removeItem('test-key');
      console.log('✅ IndexedDB connection test completed');
    } catch (error) {
      console.error('❌ IndexedDB connection test failed:', error);
    }
  },

  // Get all storage data
  async getAllData() {
    try {
      const data = await indexedDBStorage.getAllItems();
      console.log('📊 All IndexedDB data:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to get all data:', error);
    }
  },

  // Reset the IndexedDB connection
  async resetConnection() {
    try {
      indexedDBStorage.resetConnection();
      console.log('🔄 IndexedDB connection reset');
    } catch (error) {
      console.error('❌ Failed to reset connection:', error);
    }
  },

  // Clear all IndexedDB data
  async clearAll() {
    try {
      await indexedDBStorage.clear();
      console.log('🧹 All IndexedDB data cleared');
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
    }
  },

  // Force migration from localStorage
  async forceMigration() {
    try {
      // Remove migration flag to force re-migration
      localStorage.removeItem('indexeddb-migration-completed');
      
      await indexedDBStorage.migrateFromLocalStorage();
      localStorage.setItem('indexeddb-migration-completed', 'true');
      
      console.log('✅ Forced migration completed');
    } catch (error) {
      console.error('❌ Failed to force migration:', error);
    }
  },

  // Check what's in localStorage vs IndexedDB
  async compareStorage() {
    try {
      console.log('📊 Storage Comparison:');
      
      // LocalStorage data
      const localData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localData[key] = localStorage.getItem(key) || '';
        }
      }
      console.log('🏠 LocalStorage:', localData);
      
      // IndexedDB data
      const indexedData = await indexedDBStorage.getAllItems();
      console.log('💾 IndexedDB:', indexedData);
      
      // Find differences
      const allKeys = new Set([...Object.keys(localData), ...Object.keys(indexedData)]);
      const differences: string[] = [];
      
      for (const key of allKeys) {
        if (localData[key] !== indexedData[key]) {
          differences.push(key);
        }
      }
      
      if (differences.length > 0) {
        console.warn('⚠️ Differences found in keys:', differences);
      } else {
        console.log('✅ Storage is in sync');
      }
      
      return { localData, indexedData, differences };
    } catch (error) {
      console.error('❌ Failed to compare storage:', error);
    }
  }
};

console.log('🛠️ IndexedDB debug utilities loaded. Use window.debugIndexedDB in console.');
console.log('Available methods:');
console.log('- testConnection(): Test basic IndexedDB operations');
console.log('- getAllData(): Get all stored data');
console.log('- resetConnection(): Reset the database connection');
console.log('- clearAll(): Clear all IndexedDB data');
console.log('- forceMigration(): Force migration from localStorage');
console.log('- compareStorage(): Compare localStorage vs IndexedDB');

export {}; // Make this a module
