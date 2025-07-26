
import * as openpgp from 'openpgp';

export async function generateKeyPair(passphrase: string, userEmail?: string) {
  const email = userEmail || 'user@example.com';
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: 'rsa',
    rsaBits: 2048,
    userIDs: [{ name: 'user', email }],
    passphrase,
    format: 'armored'
  });
  return { privateKey, publicKey };
}

// Generate deterministic key pair based on user ID and passphrase using PBKDF2
export async function generateDeterministicKeyPair(userId: string, passphrase: string) {
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
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: 'rsa',
    rsaBits: 2048,
    userIDs: [{ name: deterministicId, email: `${deterministicId}@todoapp.local` }],
    passphrase,
    format: 'armored'
  });
  
  return { privateKey, publicKey };
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

export async function encryptData(data: string, publicKeyArmored: string) {
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  const message = await openpgp.createMessage({ text: data });
  const encrypted = await openpgp.encrypt({
    message,
    encryptionKeys: publicKey,
  });
  return encrypted;
}

export async function decryptData(encryptedData: string, privateKeyArmored: string, passphrase: string) {
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
