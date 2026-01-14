
// Import keyCache at module level to avoid circular dependency issues
import { keyCache } from './keyCache';

// Generate deterministic AES key from user ID and passphrase using PBKDF2
export async function generateDeterministicAESKey(userId: string, passphrase: string, extractable: boolean = false): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = encoder.encode(`todo-app-${userId}`); // Fixed salt based on user ID
  
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-256 key
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 }, // AES-256-GCM
    extractable, // Make extractable only when needed
    ['encrypt', 'decrypt']
  );
  
  return aesKey;
}

// Generate raw key material for storage (avoids the extractable issue)
export async function generateDeterministicKeyMaterial(userId: string, passphrase: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const salt = encoder.encode(`todo-app-${userId}`);
  
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive 32 bytes of key material directly
  const keyBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passphraseKey,
    256 // 32 bytes for AES-256
  );
  
  return new Uint8Array(keyBits);
}

// Export raw key material to JSON format for storage
export async function exportKeyMaterial(keyMaterial: Uint8Array): Promise<string> {
  const keyArray = Array.from(keyMaterial);
  return JSON.stringify(keyArray);
}

// Import AES key from JSON format
export async function importAESKey(keyData: string): Promise<CryptoKey> {
  const keyArray = new Uint8Array(JSON.parse(keyData));
  return await crypto.subtle.importKey(
    'raw',
    keyArray.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate deterministic private key and export it for storage
export async function generateDeterministicPrivateKey(userId: string, passphrase: string): Promise<string> {
  const keyMaterial = await generateDeterministicKeyMaterial(userId, passphrase);
  return await exportKeyMaterial(keyMaterial);
}

// Cache a decrypted AES key for session use
export async function cacheDecryptedPrivateKey(userId: string, keyData: string, passphrase: string) {
  // Key is now derived on-demand, no caching needed
  console.log('Passphrase validated, key will be derived on-demand');
  return null;
}

// Validate passphrase by regenerating the key material and comparing with stored key
export async function validatePassphraseWithPrivateKey(storedKeyData: string, passphrase: string, userId: string): Promise<boolean> {
  try {
    const regeneratedKeyMaterial = await generateDeterministicKeyMaterial(userId, passphrase);
    const regeneratedKeyData = await exportKeyMaterial(regeneratedKeyMaterial);
    return storedKeyData === regeneratedKeyData;
  } catch (error) {
    return false;
  }
}

// AES-GCM encryption
export async function encryptData(data: string, userId: string, passphrase?: string): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  let aesKey: CryptoKey;
  
  // Try to use cached key first if no passphrase provided
  if (!passphrase) {
    const cachedKey = await keyCache.getDecryptedKey(userId);
    if (cachedKey) {
      aesKey = cachedKey;
    } else {
      throw new Error('No passphrase provided and no cached key available for encryption');
    }
  } else {
    // Derive key from passphrase
    const keyMaterial = await generateDeterministicKeyMaterial(userId, passphrase);
    aesKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
  }
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    encoder.encode(data)
  );
  
  // Combine IV and encrypted data, then encode to base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

// AES-GCM decryption
export async function decryptData(encryptedData: string, userId: string, passphrase?: string): Promise<string> {
  try {
    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    let aesKey: CryptoKey;
    
    // Try to use cached key first if no passphrase provided
    if (!passphrase) {
      const cachedKey = await keyCache.getDecryptedKey(userId);
      if (cachedKey) {
        aesKey = cachedKey;
      } else {
        throw new Error('No passphrase provided and no cached key available for decryption');
      }
    } else {
      // Derive key from passphrase
      const keyMaterial = await generateDeterministicKeyMaterial(userId, passphrase);
      aesKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial.buffer as ArrayBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
    }
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Data may be corrupted or passphrase may be incorrect.');
  }
}

// Utility function to validate passphrase strength
export function validatePassphraseStrength(passphrase: string): { valid: boolean; message: string } {
  if (passphrase.length < 6) {
    return { valid: false, message: 'Passphrase must be at least 6 characters long' };
  }
  
  return { valid: true, message: 'Passphrase is valid' };
}
