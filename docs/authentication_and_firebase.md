# Authentication & Firebase Integration

This document describes the Firebase authentication and Firestore integration implemented in the Xodo todo application.

## Overview

The application supports both anonymous and authenticated users:
- **Anonymous users**: Data is stored locally in localStorage only
- **Authenticated users**: Data is synchronized between localStorage and Firestore in real-time

## Authentication Flow

### Anonymous Mode (Default)
- Users can use the application immediately without signing in
- All todo data is stored in localStorage
- Data persists only on the current device/browser

### Google OAuth Sign-in
1. User clicks on their profile area in the navbar
2. A dropdown appears with "Sign in with Google" option
3. User is redirected to Google OAuth consent screen
4. Upon successful authentication:
   - User profile is created/updated in Firestore
   - Local localStorage data is automatically synced to Firestore
   - Real-time sync is enabled between localStorage and Firestore

### Sign-out
1. User clicks on their profile area in the navbar
2. A dropdown appears with user info and "Sign out" option
3. Upon sign-out:
   - User is signed out of Firebase Auth
   - Real-time sync is disabled
   - Local data remains in localStorage
   - UI switches back to anonymous mode

## Architecture

### Components

#### `AuthProvider`
- Wraps the entire application
- Initializes Firebase authentication state
- Enables Firestore sync hooks for authenticated users

#### `UserDropdown`
- Displays user profile in the navbar
- Shows "Anonymous" for non-authenticated users
- Provides sign-in/sign-out functionality
- Shows user's Google profile picture and name when authenticated

### Stores

#### `authStore` (Zustand)
- Manages authentication state
- Handles sign-in/sign-out operations
- Manages user profile data
- Coordinates with Firestore service

### Services

#### `firestoreService`
- Handles all Firestore operations
- Syncs localStorage data to Firestore
- Loads Firestore data to localStorage
- Manages real-time listeners for data updates

### Hooks

#### `useFirestoreSync`
- Automatically syncs localStorage changes to Firestore
- Debounces frequent changes to avoid excessive API calls
- Only active for authenticated users

#### `useFirestoreListener`
- Listens for real-time Firestore updates
- Updates localStorage when changes are detected
- Prevents infinite sync loops

## Data Structure

### Firestore Collections

```
users/{userId}/
  ├── (user profile document)
  └── todoLists/{listTitle}
      ├── title: string
      ├── storageKey: string
      ├── todos: TodoItem[]
      └── lastModified: Timestamp
```

### TodoItem Interface
```typescript
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Storage Key Implementation
The application now uses a scalable storage key system where each todo list document in Firestore contains its own `storageKey` field. This eliminates the need for hardcoded mappings and enables dynamic creation of todo lists.

#### Key Features:
- **Dynamic Creation**: New todo lists can be created with custom titles and storage keys
- **Database-Driven**: Storage key mappings are stored in Firestore, not in code
- **Backward Compatible**: Existing lists continue to work without modification
- **Scalable**: No code changes required when adding new todo lists

#### Default Todo Lists:
| List Title | localStorage Key | Firestore Document ID |
|------------|------------------|----------------------|
| main       | todos1          | main                 |
| admin      | todos2          | admin                |
| study      | todos3          | study                |
| work       | todos4          | work                 |
| project    | todos5          | project              |
| hobby      | todos6          | hobby                |

*Note: These are the default lists. Users can create additional lists with custom storage keys.*

## Sync Behavior

### Initial Sign-in
1. Local data is uploaded to Firestore
2. If Firestore has newer data, it overwrites local data
3. Real-time sync is enabled

### Real-time Updates
1. Local changes are debounced and synced to Firestore
2. Firestore changes are immediately reflected in localStorage
3. UI components re-render automatically when localStorage changes

### Conflict Resolution
- Firestore is considered the source of truth
- Last-write-wins for simultaneous updates
- No complex merge strategies implemented

## Security

### Firebase Security Rules
Recommended Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow read/write access to user's todo lists
      match /todoLists/{listId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Authentication
- Uses Firebase Authentication with Google OAuth provider
- No custom authentication logic
- Relies on Firebase security for user verification

## Environment Variables

Required environment variables in `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

## Error Handling

### Authentication Errors
- Network errors during sign-in are logged to console
- UI shows loading states during authentication operations
- Failed operations don't crash the application

### Sync Errors
- Firestore sync errors are logged but don't affect local functionality
- Local data remains accessible even if sync fails
- Retry mechanisms built into Firebase SDK

## Performance Considerations

### Debouncing
- localStorage changes are debounced (1 second) before syncing to Firestore
- Prevents excessive API calls during rapid typing

### Real-time Listeners
- Only one listener per user session
- Automatically cleaned up on component unmount
- Minimal impact on performance

### Local-first Approach
- Application remains fully functional offline
- Local operations are never blocked by network requests
- Sync happens in the background

## Future Enhancements

### Potential Improvements
1. **Offline Support**: Better handling of offline scenarios
2. **Conflict Resolution**: More sophisticated merge strategies
3. **Data Migration**: Tools for migrating between data formats
4. **Backup/Export**: Allow users to export their data
5. **Sharing**: Enable sharing of todo lists between users
6. **Collaborative Editing**: Real-time collaborative features

## API Reference

### FirestoreService Methods

#### Dynamic List Management
```typescript
// Create a new todo list with custom storage key
async createTodoList(
  user: User, 
  title: string, 
  storageKey: string, 
  todos: TodoItem[] = []
): Promise<void>
```

#### Metadata Operations
```typescript
// Get all todo lists with complete metadata
async getAllTodoListsWithMetadata(user: User): Promise<Record<string, TodoList>>
```

#### Enhanced Sync Methods
```typescript
// Sync local storage change by storage key (now database-driven)
async syncLocalStorageChange(user: User, storageKey: string): Promise<void>

// Load specific todo list (returns storage key)
async loadTodoListFromFirestore(
  user: User, 
  listTitle: string
): Promise<{ todos: TodoItem[], storageKey?: string } | null>

// Real-time subscription (includes storage keys)
subscribeToUserTodoLists(
  user: User, 
  callback: (lists: Record<string, { todos: TodoItem[], storageKey: string }>) => void
): () => void
```

#### Legacy Methods (Still Supported)
```typescript
// Core sync operations
async syncAllLocalDataToFirestore(user: User): Promise<void>
async saveTodoListToFirestore(user: User, listTitle: string, storageKey: string, todos: TodoItem[]): Promise<void>
async loadAllTodoListsFromFirestore(user: User): Promise<void>
async deleteTodoListFromFirestore(user: User, listTitle: string): Promise<void>
```

### Usage Examples

#### Creating Custom Todo Lists
```typescript
import { firestoreService } from '@/services/firestoreService';
import { useAuthStore } from '@/stores/authStore';

// In a React component
const { user } = useAuthStore();

// Create a new custom list
const createCustomList = async () => {
  if (user) {
    await firestoreService.createTodoList(
      user,
      'my-project',           // List title
      'todos_project_123',    // Custom storage key
      []                      // Initial todos (empty)
    );
  }
};
```

#### Retrieving All Lists with Metadata
```typescript
// Get complete information about all lists
const getAllListsInfo = async () => {
  if (user) {
    const listsWithMetadata = await firestoreService.getAllTodoListsWithMetadata(user);
    
    // Example result:
    // {
    //   'main': { title: 'main', storageKey: 'todos1', todos: [...], lastModified: Date },
    //   'my-project': { title: 'my-project', storageKey: 'todos_project_123', todos: [...], lastModified: Date }
    // }
    
    return listsWithMetadata;
  }
};
```

#### Real-time Sync with Storage Keys
```typescript
// Subscribe to real-time updates
useEffect(() => {
  if (user) {
    const unsubscribe = firestoreService.subscribeToUserTodoLists(
      user,
      (lists) => {
        // Each list now includes its storage key
        Object.entries(lists).forEach(([title, { todos, storageKey }]) => {
          localStorage.setItem(storageKey, JSON.stringify(todos));
        });
      }
    );

    return unsubscribe;
  }
}, [user]);
```
