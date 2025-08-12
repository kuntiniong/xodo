# Xodo: A Privacy & Keyboard-first Todo App
An End-to-End Encrypted (E2EE), keyboard-centric productivity web app with Unix-like commands
## Features
> the demo GIFs take *quite* a while to load, you can check out other sections first or directly try it yourself on [xodo.ktiong.com](https://xodo.ktiong.com) ;\)

### 1. Keyboard-Centric
- Use Xodo with familiar Unix-style commands if you're a developer or keyboard enthusiast.
<img src="img/unix.gif">

> *See the full [list of commands](https://www.ktiong.com/blog/xodo-doc) supported.*

### 2. Privacy-Preserving
- Only your Google account name and email address are ever known to us. All your todo data is encrypted locally before being securely synced to the cloud — ensuring only YOU can read your tasks.
<img src="img/encrypt.gif">

### 3. Ultra Responsive
- Enjoy a fast, fluid UI experience with the Masonry library on ANY devices.
<img src="img/responsive.gif">

## Table of Contents
- [Workflow](#workflow)
- [Tech Stack](#tech-stack)
- [FAQ](#faq)

## Workflow
<img src="img/flow-chart.png">

## Tech Stack
### Frontend
- Next.js, Tailwind CSS, shadcn/ui, Masonry, IndexedDB
### Backend
- Firebase 
  - Auth: Google OAuth2 
  - Binary Storage: Firestore
### Cryptographic Algorithm
- Web Crypto API
  - Hashing: PBKDF2 with SHA-256
  - Crypto: AES-GCM
### Deployment
- Vercel

## FAQ
### 1. Why do we need the encrypted private key when we can use the pass phrase to directly encrypt the data?
**Answer:** We use the encrypted private key approach for several important reasons:
1. **Deterministic Key Generation:** The private key is generated deterministically from your user ID + passphrase using PBKDF2, ensuring the same key is always generated for the same user/passphrase combination
2. **Cross-Device Consistency:** When you log in from different devices, the system needs to decrypt data that was encrypted on other devices. Storing the encrypted private key in Firestore allows any device to retrieve and decrypt it with your passphrase
3. **OpenPGP Standard:** We use OpenPGP encryption which is battle-tested and provides strong security guarantees
4. **Key Management:** It separates key management from data encryption, following cryptographic best practices

### 2. What's the advantage of using passphrase instead of a more secure password here?
**Answer:** The term "passphrase" is used because:
1. **User Experience:** "Passphrase" suggests it can be a sentence or phrase, making it more memorable than a complex password
2. **Length over Complexity:** Passphrases encourage longer strings, which are more secure than short complex passwords
3. **Memorability:** Users are more likely to remember "my secret todo list for 2025" than "Mx9@kL#pW2"
4. **PBKDF2 Strengthening:** The passphrase is strengthened with 100,000 iterations of PBKDF2, making brute force attacks computationally expensive

### 3. What does the program cache? the passphrase or the encrypted private key?
**Answer:** The program now only caches the **decrypted private key** in memory during the session:
- **Decrypted Private Key:** Cached in memory (not persisted) so it doesn't need to be re-decrypted on every operation
- **No Passphrase Storage:** The passphrase is only used during login to decrypt the private key and is immediately discarded
- **Location:** Stored in memory using a simple JavaScript Map for the duration of the session

### 4. Where is the cache store?
**Answer:** The cache is now stored in memory only:
1. **In-Memory Key Cache:** A simple JavaScript Map that stores decrypted OpenPGP private keys
2. **`TodoAppStorage` (IndexedDB):** Main application data (todos, settings) - unchanged
3. **No Persistent Session Storage:** The decrypted private key is only kept in memory and cleared when the browser tab closes or user logs out

**Security Benefits:**
- **No Disk Persistence:** Sensitive decrypted keys are never written to disk
- **Automatic Cleanup:** Memory is automatically cleared when the tab closes
- **Reduced Attack Surface:** No persistent storage of sensitive cryptographic material

### 5. Do the program store the decrypted json in the IndexedDB so that the import/export function still works when logged in? How does the system ensure this is secure?
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