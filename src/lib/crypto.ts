
// Import keyCache at module level to avoid circular dependency issues
import { keyCache } from './keyCache';

const PBKDF2_ITERATIONS = 100000;
const MASTER_KEY_BITS = 512;

function getSalt(userId: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`todo-app-${userId}`);
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

async function deriveMasterKeyMaterial(userId: string, passphrase: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const keyBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(getSalt(userId)),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passphraseKey,
    MASTER_KEY_BITS
  );

  return new Uint8Array(keyBits);
}

function splitSubkeys(masterKey: Uint8Array): { verificationKey: Uint8Array; cryptoKeyMaterial: Uint8Array } {
  const verificationKey = masterKey.slice(0, 32); // first 256 bits
  const cryptoKeyMaterial = masterKey.slice(32, 64); // second 256 bits
  return { verificationKey, cryptoKeyMaterial };
}

export async function deriveVerificationHash(userId: string, passphrase: string): Promise<string> {
  const masterKey = await deriveMasterKeyMaterial(userId, passphrase);
  const { verificationKey } = splitSubkeys(masterKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(verificationKey));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function deriveCryptoKeyFromPassphrase(
  userId: string,
  passphrase: string,
  extractable: boolean = false
): Promise<CryptoKey> {
  const masterKey = await deriveMasterKeyMaterial(userId, passphrase);
  const { cryptoKeyMaterial } = splitSubkeys(masterKey);
  return await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(cryptoKeyMaterial),
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt']
  );
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
    // Derive CK from passphrase
    aesKey = await deriveCryptoKeyFromPassphrase(userId, passphrase, false);
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
      // Derive CK from passphrase
      aesKey = await deriveCryptoKeyFromPassphrase(userId, passphrase, false);
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
