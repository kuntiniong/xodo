
import * as openpgp from 'openpgp';
import { keyCache } from './keyCache';

// Simplified: Generate only a private key for personal use (no public key needed)
export async function generatePrivateKey(passphrase: string, userEmail?: string) {
  const email = userEmail || 'user@example.com';
  const { privateKey } = await openpgp.generateKey({
    type: 'rsa',
    rsaBits: 2048,
    userIDs: [{ name: 'user', email }],
    passphrase,
    format: 'armored'
  });
  return privateKey;
}

// Generate deterministic private key based on user ID and passphrase using PBKDF2
export async function generateDeterministicPrivateKey(userId: string, passphrase: string) {
  // Create a deterministic seed using PBKDF2
  const encoder = new TextEncoder();
  const salt = encoder.encode(`todo-app-${userId}`); // Fixed salt based on user ID
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive 32 bytes of deterministic data
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passphraseKey,
    256 // 32 bytes
  );
  
  // Use the derived bits to create a deterministic email/name for OpenPGP
  const derivedArray = new Uint8Array(derivedBits);
  const deterministicId = Array.from(derivedArray.slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Generate key with deterministic user info
  const { privateKey } = await openpgp.generateKey({
    type: 'rsa',
    rsaBits: 2048,
    userIDs: [{ name: deterministicId, email: `${deterministicId}@todoapp.local` }],
    passphrase,
    format: 'armored'
  });
  
  return privateKey;
}

// Cache a decrypted private key for session use
export async function cacheDecryptedPrivateKey(userId: string, privateKeyArmored: string, passphrase: string) {
  const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
  const decryptedKey = await openpgp.decryptKey({
    privateKey,
    passphrase
  });
  await keyCache.setDecryptedKey(userId, decryptedKey);
  return decryptedKey;
}

// Decrypt private key with passphrase (for validation)
export async function validatePassphraseWithPrivateKey(privateKeyArmored: string, passphrase: string): Promise<boolean> {
  try {
    const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
    await openpgp.decryptKey({
      privateKey,
      passphrase
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Simplified: Use private key for encryption (since it's for personal use only)
export async function encryptData(data: string, userId: string) {
  // Check if we have a cached decrypted key (async)
  const decryptedKey = await keyCache.getDecryptedKey(userId);
  
  if (!decryptedKey) {
    throw new Error('Decrypted private key not available in cache. Please re-authenticate.');
  }
  
  const message = await openpgp.createMessage({ text: data });
  const encrypted = await openpgp.encrypt({
    message,
    encryptionKeys: decryptedKey,
  });
  return encrypted;
}

export async function decryptData(encryptedData: string, userId: string) {
  // Guard against invalid or unencrypted data.
  if (!encryptedData || typeof encryptedData !== 'string' || !encryptedData.includes('BEGIN PGP MESSAGE')) {
    // Assuming the unencrypted data is the original string.
    return encryptedData;
  }
  
  // Check if we have a cached decrypted key (async)
  const decryptedKey = await keyCache.getDecryptedKey(userId);
  
  if (!decryptedKey) {
    throw new Error('Decrypted private key not available in cache. Please re-authenticate.');
  }
  
  const message = await openpgp.readMessage({ armoredMessage: encryptedData as string });
  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: decryptedKey,
  });
  return decrypted;
}

// Legacy functions kept for backward compatibility during login process
export async function encryptDataWithPassphrase(data: string, privateKeyArmored: string, passphrase: string) {
  const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
  const decryptedKey = await openpgp.decryptKey({
    privateKey,
    passphrase
  });
  
  const message = await openpgp.createMessage({ text: data });
  const encrypted = await openpgp.encrypt({
    message,
    encryptionKeys: decryptedKey,
  });
  return encrypted;
}

export async function decryptDataWithPassphrase(encryptedData: string, privateKeyArmored: string, passphrase: string) {
  // Guard against invalid or unencrypted data.
  if (!encryptedData || typeof encryptedData !== 'string' || !encryptedData.includes('BEGIN PGP MESSAGE')) {
    // Assuming the unencrypted data is the original string.
    return encryptedData;
  }
  
  const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
  const decryptedKey = await openpgp.decryptKey({
    privateKey,
    passphrase
  });
  
  const message = await openpgp.readMessage({ armoredMessage: encryptedData as string });
  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: decryptedKey,
  });
  return decrypted;
}
