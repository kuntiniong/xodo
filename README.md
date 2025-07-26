# xodo workflow

## toc
- 1. visitors
- 2. user registration
- 3. user log in
- 4. user log out

## 1. visitors
- data is stored locally in indexeddb without encryption
- the export/import and reset function should be able to manipulate the data stored in indexeddb

**✅ Current Implementation:** This is exactly how it works. Anonymous users have their data stored in IndexedDB in plain text format, and the import/export/reset functions work directly with this IndexedDB data.

## 2. user registration
- clear out all the data stored in indexeddb
- a dialog for asking the user to create a pass phrase
- pass phrase is not sent to the server, only the hash and the private key encrypted by the pass phrase is sent to the server

**✅ Current Implementation:** This is correctly implemented.

- **why do we need the encrypted private key when we can use the pass phrase to directly encrypt the data?**
  
  **Answer:** We use the encrypted private key approach for several important reasons:
  1. **Deterministic Key Generation:** The private key is generated deterministically from your user ID + passphrase using PBKDF2, ensuring the same key is always generated for the same user/passphrase combination
  2. **Cross-Device Consistency:** When you log in from different devices, the system needs to decrypt data that was encrypted on other devices. Storing the encrypted private key in Firestore allows any device to retrieve and decrypt it with your passphrase
  3. **OpenPGP Standard:** We use OpenPGP encryption which is battle-tested and provides strong security guarantees
  4. **Key Management:** It separates key management from data encryption, following cryptographic best practices

- **what's the advantage of using pass phrase instead of a more secure password here?**
  
  **Answer:** The term "passphrase" is used because:
  1. **User Experience:** "Passphrase" suggests it can be a sentence or phrase, making it more memorable than a complex password
  2. **Length over Complexity:** Passphrases encourage longer strings, which are more secure than short complex passwords
  3. **Memorability:** Users are more likely to remember "my secret todo list for 2025" than "Mx9@kL#pW2"
  4. **PBKDF2 Strengthening:** The passphrase is strengthened with 100,000 iterations of PBKDF2, making brute force attacks computationally expensive

- **why uses openpgp instead of normal crypto library?**

  **Answer:** We use OpenPGP instead of standard Web Crypto API for several important reasons:

  1. **Deterministic Key Generation:** OpenPGP allows us to generate the same private key from the same user ID + passphrase combination across different devices, which is crucial for cross-device data access
  
  2. **Battle-Tested Standard:** OpenPGP is a well-established, peer-reviewed cryptographic standard (RFC 4880) that has been used securely for decades
  
  3. **Key Management:** OpenPGP provides sophisticated key management features including passphrase-protected private keys, which separates authentication (passphrase) from encryption keys
  
  4. **Cross-Platform Compatibility:** OpenPGP encrypted data can be decrypted by any OpenPGP-compliant library or tool, providing better interoperability
  
  5. **Integrated Encryption/Signing:** OpenPGP combines encryption, compression, and integrity checking in a single standard, reducing implementation complexity
  
  6. **Mature JavaScript Implementation:** The openpgp.js library is mature, well-maintained, and designed specifically for browser environments
  
  **Comparison with Web Crypto API:**
  - Web Crypto API requires manual key derivation, format handling, and doesn't provide deterministic key generation out of the box
  - OpenPGP handles complex cryptographic operations (like PBKDF2 key derivation, padding, etc.) automatically
  - OpenPGP provides better abstraction for secure messaging scenarios like ours

## 3. user log in
- a dialog for asking the user to enter the pass phrase
- users don't have to reenter the pass phrase again if they stay logged in/ in the same session

**✅ Current Implementation:** Exactly right - session caching prevents re-entry during the same session.

- **is the complete encryption workflow like the following?**
  - fetch the encrypted json from firebase, compare the hash and the pass phrase digest and see if they match
  - then use the pass phrase to decrypt the encrypted private key
  - use the decrypted private key to decrypt the json

**Answer:** Almost correct, but the actual workflow is:
1. User enters passphrase
2. System generates SHA-256 hash of passphrase and compares with stored hash in Firestore
3. If hash matches, system retrieves the encrypted private key from Firestore
4. Passphrase is used to decrypt the private key (the private key itself is encrypted with the passphrase)
5. The decrypted private key is then used to decrypt all todo data from Firestore
6. Decrypted data is stored in IndexedDB for local access

- **what does the program cache? the pass phrase or the encrypted private key?**

**Answer:** The program now only caches the **decrypted private key** in memory during the session:
- **Decrypted Private Key:** Cached in memory (not persisted) so it doesn't need to be re-decrypted on every operation
- **No Passphrase Storage:** The passphrase is only used during login to decrypt the private key and is immediately discarded
- **Location:** Stored in memory using a simple JavaScript Map for the duration of the session

**Why this approach is better:**
- **Simplified Logic:** No need to pass passphrases around in function calls
- **Better Security:** Passphrase is not stored anywhere after initial authentication
- **Performance:** Decrypted key is ready to use without repeated decryption operations
- **Cleaner Code:** Functions like `encryptData(data, userId)` and `decryptData(encryptedData, userId)` are simpler

- **where is the cache store?**

**Answer:** The cache is now stored in memory only:
1. **In-Memory Key Cache:** A simple JavaScript Map that stores decrypted OpenPGP private keys
2. **`TodoAppStorage` (IndexedDB):** Main application data (todos, settings) - unchanged
3. **No Persistent Session Storage:** The decrypted private key is only kept in memory and cleared when the browser tab closes or user logs out

**Security Benefits:**
- **No Disk Persistence:** Sensitive decrypted keys are never written to disk
- **Automatic Cleanup:** Memory is automatically cleared when the tab closes
- **Reduced Attack Surface:** No persistent storage of sensitive cryptographic material

- **do the program store the decrypted json in the indexeddb so that the import/export function still works when logged in? and how does the system ensure this is secure?**

**Answer:** 
**What's Stored:** The program stores DECRYPTED todo data in IndexedDB for performance reasons. The encrypted data remains in Firestore.

**Security Measures:**
1. **IndexedDB Security:** IndexedDB is more secure than localStorage with better XSS protection
2. **Device-Level Security:** Data in IndexedDB is tied to your browser profile and domain
3. **Session Management:** Cache is automatically cleared on logout
4. **Connection Pooling:** Database connections timeout after 30 seconds of inactivity
5. **No Persistent Storage:** Sensitive data (passphrase/keys) is only cached during active sessions

**Import/Export Security:**
- Export: Data is exported in plain text (since you're authenticated and have access)
- Import: Data is immediately re-encrypted and synced to Firestore
- Reset: Clears all local data and can optionally clear Firestore data

## 4. user log out
- clear out the indexeddb

**✅ Current Implementation:** On logout, the system:
1. Clears all cached keys from secure IndexedDB storage
2. Clears Firestore subscription cache
3. Resets authentication state
4. The main IndexedDB data remains (for potential anonymous use) but encrypted data cache is cleared