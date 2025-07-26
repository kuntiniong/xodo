# Comprehensive Guide

This document provides a complete overview of the Xodo todo application, from user-facing features to the underlying technical implementation.

## 1. User Guide

### 1.1. Getting Started

- **Anonymous Usage**: When you first visit, you can immediately use the app without an account. All todo list data is stored locally in your browser's `localStorage`.
- **Sign In**: To back up and sync your data across devices, sign in with a Google account.

### 1.2. Authentication

- **Sign-In Process**: Click the profile area in the top-right, select "Sign in with Google," and follow the prompts. Your local data will be automatically synced to the cloud.
- **Sign-Out Process**: Click your profile, select "Sign out." Your data remains in the cloud, and your device returns to anonymous mode.

### 1.3. Command-Line Interface

The application features a command-line interface for managing tasks.

| Command | Description | Example |
|---|---|---|
| `cd <list-name>` | Navigate to a specific list. | `cd work` |
| `clear` | Scroll to the top of the page. | `clear` |
| `add "<task>"` | Add a task to the current list. | `add "My new task"` |
| `rm <task-id>` | Remove a task. | `rm 3` |
| `rm <task-id> --done` | Mark a task as complete. | `rm 3 --done` |

## 2. Technical Implementation

### 2.1. Technology Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Backend**: Firebase Authentication, Cloud Firestore
- **Encryption**: OpenPGP.js for end-to-end encryption

### 2.2. Architecture

- **Local-First**: The application is designed to work offline. Todo list data is stored in `localStorage` and synced to Firestore in the background.
- **State Management**: Zustand is used for global state management, with separate stores for authentication, sidebar, and the Pomodoro timer to prevent unnecessary re-renders.
- **Data Flow**: User actions update the local state and `localStorage` immediately. A debounced synchronization process then updates Firestore.

### 2.3. Project Structure

```
src/
├── app/         # Main application logic
├── components/  # Reusable UI components
├── hooks/       # Custom React hooks
├── lib/         # Core libraries (Firebase, OpenPGP, secureStorage)
├── services/    # Firestore service layer
└── stores/      # Zustand state management
```

## 3. Authentication and Data Sync

### 3.1. End-to-End Encryption

- **Passphrase**: On first login, you will be prompted to create a passphrase. This passphrase is used to encrypt your data *on your device* before it is sent to Firestore.
- **Key Management**: Your passphrase is used to generate a public/private key pair. The public key and the encrypted private key are stored in Firestore. Your raw passphrase is never stored on any server.
- **Secure Session Caching**: To avoid re-entering your passphrase on every page load, your passphrase and keys are cached in your browser's **localStorage** for the duration of your session. This cache is cleared when you log out. While the project includes a `secureStorage.ts` utility for IndexedDB, it is not currently used for caching sensitive session data.

### 3.2. Data Synchronization

- **Anonymous Users**: Data is stored in `localStorage` only.
- **Authenticated Users**:
    - On login, data is synced from Firestore to `localStorage`.
    - Changes to `localStorage` are debounced and synced to Firestore.
    - Real-time listeners update `localStorage` with changes from other devices.
- **Conflict Resolution**: The last-write-wins. Firestore is the source of truth.

### 3.3. Firestore Data Model

- **Users**: A `users` collection stores user profiles, public keys, and encrypted private keys.
- **Todo Lists**: Each user has a `todoLists` sub-collection where each document represents a todo list. The document ID is a unique `storageKey`.

## 4. Firebase Setup

### 4.1. Project Creation

1.  Create a new project in the [Firebase Console](https://console.firebase.google.com/).
2.  Register a new web app and copy the configuration.
3.  Enable **Google Authentication**.
4.  Create a **Firestore Database** in test mode for development.

### 4.2. Security Rules

Use the following Firestore security rules to restrict access to user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /todoLists/{listId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 4.3. Environment Variables

Create a `.env.local` file with your Firebase project configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```