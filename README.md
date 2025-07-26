## Checklist
- [x] fix timer state management issues (it stops when it auto hides in the hamburger menu)
- [x] add dynamic metadata title for timer
- [ ] fix layout for tablet hamburger menu
- [x] add footer
- [ ] fix button ui
- [x] refactor data storage logic with localStorage instead of cookies
- [x] **NEW ACCOUNT SETUP**: Ensure new accounts automatically get the six todo list templates

## New Account Setup Workflow

When a new user signs up for the first time, the application automatically provides them with six pre-configured todo list templates:

### Default Templates Created
1. **main** (todos1) - Green accent color
2. **admin** (todos2) - Red accent color  
3. **study** (todos3) - Yellow accent color
4. **work** (todos4) - Blue accent color
5. **project** (todos5) - Purple accent color
6. **hobby** (todos6) - Orange accent color

### New User Flow
1. User opens app (anonymous mode with 6 empty templates visible)
2. User signs in with Google OAuth
3. System detects new user and prompts for passphrase
4. Upon passphrase entry:
   - PGP key pair is generated and encrypted with passphrase
   - Six default template lists are automatically created in Firestore
   - Any existing localStorage data is synced to Firestore
   - Real-time synchronization is established
5. User can immediately start using all six todo lists

### Data Persistence
- **Anonymous Mode**: Data stored only in localStorage
- **Authenticated Mode**: Data encrypted and synced to Firestore
- **Logout**: localStorage cleared, UI reverts to anonymous templates
- **Re-login**: User data restored from Firestore to localStorage

## Encryption Implementation

The application utilizes the `openpgp.js` library to perform client-side, end-to-end encryption. All cryptographic operations occur on the user's device, ensuring that unencrypted data is never transmitted to the server.

### Key Management (`src/lib/openpgp.ts`)

- **Key Pair Generation**: The `generateKeyPair` function is called to create a new public/private key pair.
  - **Algorithm**: It uses Elliptic Curve Cryptography (ECC) with the `curve25519` curve, which offers a good balance of security and performance.
  - **User Identity**: A default `userIDs` field is attached to the key.
  - **Passphrase Protection**: The generated private key is immediately encrypted with the user-provided passphrase, preventing unauthorized access.

### Encryption Workflow (`src/services/firestoreService.ts`)

- **Client-Side Encryption**: Before a `TodoItem` is saved to Firestore, the `saveTodoListToFirestore` function in `firestoreService` is invoked.
- **Data Serialization**: The `TodoItem` object is first serialized into a JSON string.
- **Encryption Call**: This string is passed to the `encryptData` function in `openpgp.ts`.
  - The `encryptData` function uses `openpgp.encrypt`, taking the user's public key (retrieved from `authStore`) to encrypt the message.
- **Firestore Storage**: The resulting armored PGP message (a string) is what gets stored in the `encryptedData` field of the document in Firestore. The server and database only ever handle this encrypted string.

### Decryption Workflow (`src/services/firestoreService.ts`)

- **Data Retrieval**: When fetching data, the encrypted PGP message is retrieved from Firestore.
- **Client-Side Decryption**: The `loadAllTodoListsFromFirestore` (and other loader functions) call the `decryptData` function in `openpgp.ts`.
- **Decryption Call**: `decryptData` uses `openpgp.decrypt` with the following parameters:
  - The encrypted message.
  - The user's armored private key (retrieved from `authStore`).
  - The user's passphrase to unlock the private key.
- **Data Deserialization**: The decrypted result is a JSON string, which is then parsed back into a `TodoItem` object for use in the application.

This entire process ensures that the server is zero-knowledge, meaning it has no ability to view or access the user's private data.

## Firebase Setup and Key Storage

No special configuration is required for your Firebase project, as all encryption happens on the client. However, it is critical to have the correct **Firestore Security Rules** to protect user data.

### Firestore Security Rules

Your security rules should ensure that users can only read and write to their own documents. The application stores all user-specific data, including cryptographic keys, in a document at `users/{userId}`.

Here is a recommended basic ruleset:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write only their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Key Storage

The public and (encrypted) private keys are stored in two locations:

1.  **Firestore**: Upon generation, the keys are saved to the user's document in the `users` collection (at `users/{userId}`). This allows the keys to persist between sessions and across devices.
2.  **Client-Side State**: When a user logs in, the keys are loaded from Firestore into the Zustand `authStore`. They are held in memory for the duration of the session to perform cryptographic operations without needing to query the database repeatedly.
