import { create } from 'zustand';
import { User } from 'firebase/auth';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  getDocs
} from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { firestoreService } from '@/services/firestoreService';
import { generateDeterministicPrivateKey, cacheDecryptedPrivateKey } from '@/lib/crypto';
import { keyCache } from '@/lib/keyCache';
import { indexedDBStorage } from '@/lib/indexedDBStorage';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  privateKey: string | null;
  isPassphraseRequired: boolean;
  passphraseMode: 'create' | 'unlock';
  passphraseError: string | null;
  authUnsubscribe?: (() => void) | null;
  firestoreUnsubscribe?: (() => void) | null;
  // Authentication flow state management
  authFlowState: 'idle' | 'signing-in' | 'loading-keys' | 'generating-keys' | 'ready';
  keyOperationInProgress: boolean;
  lastAuthAttempt: number;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncLocalDataToFirestore: () => Promise<void>;
  loadUserDataFromFirestore: (passphrase: string) => Promise<void>;
  initialize: () => void;
  generateAndStoreKeys: (passphrase: string) => Promise<void>;
  loadKeys: () => Promise<void>;
  setPassphraseRequired: (isRequired: boolean) => void;
  createDefaultTemplateForNewUser: () => Promise<void>;
  clearPassphraseError: () => void;
  checkCachedSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  privateKey: null,
  isPassphraseRequired: false,
  passphraseMode: 'unlock',
  passphraseError: null,
  authUnsubscribe: null,
  firestoreUnsubscribe: null,
  // Authentication flow state management
  authFlowState: 'idle',
  keyOperationInProgress: false,
  lastAuthAttempt: 0,

  initialize: () => {
    const state = get();
    
    // Prevent multiple initializations
    if (state.authUnsubscribe) {
      console.log('Auth already initialized, skipping duplicate initialization');
      return;
    }
    
    console.log('Initializing authentication state management...');
    
    const newAuthUnsubscribe = onAuthStateChanged(auth, async (user) => {
      const currentState = get();
      
      // Skip if this is the same user (prevents redundant operations on page reload)
      if (currentState.user && user && currentState.user.uid === user.uid && currentState.isInitialized) {
        console.log('Same user detected, skipping redundant authentication processing');
        return;
      }
      
      // Set loading state during auth state change
      set({ isLoading: true, authFlowState: 'loading-keys' });
      
      try {
        if (user) {
          console.log('User authenticated:', user.uid);
          set({ user, isInitialized: true });
          
          // Check for cached session first
          const hasCachedSession = await get().checkCachedSession();
          
          if (hasCachedSession) {
            console.log('Cached session restored successfully');
            set({ authFlowState: 'ready', isLoading: false });
          } else {
            console.log('No cached session found, loading keys from Firestore');
            await get().loadKeys();
            set({ authFlowState: 'ready', isLoading: false });
          }
        } else {
          console.log('User signed out, resetting auth state');
          // Clean up previous user's Firestore subscription
          if (currentState.firestoreUnsubscribe) {
            currentState.firestoreUnsubscribe();
          }
          
          // Reset state to initial values
          set({
            user: null,
            isLoading: false,
            isInitialized: true,
            privateKey: null,
            isPassphraseRequired: false,
            passphraseMode: 'unlock',
            passphraseError: null,
            firestoreUnsubscribe: null,
            authFlowState: 'idle',
            keyOperationInProgress: false,
          });
        }
      } catch (error) {
        console.error('Error during authentication state change:', error);
        set({ 
          isLoading: false,
          authFlowState: 'idle',
          passphraseError: 'Authentication error occurred. Please try again.',
        });
      }
    });
    
    // Store the auth unsubscribe function
    set({ authUnsubscribe: newAuthUnsubscribe });
  },

  signInWithGoogle: async () => {
    const currentState = get();
    
    // Prevent spam/multiple simultaneous sign-in attempts
    const now = Date.now();
    if (currentState.isLoading || currentState.authFlowState === 'signing-in') {
      console.log('Sign-in already in progress, ignoring duplicate request');
      return;
    }
    
    // Throttle sign-in attempts to prevent spam (5 second cooldown)
    if (now - currentState.lastAuthAttempt < 5000) {
      console.log('Sign-in attempt too soon, please wait');
      set({ passphraseError: 'Please wait before trying again' });
      return;
    }
    
    set({ 
      isLoading: true, 
      authFlowState: 'signing-in',
      lastAuthAttempt: now,
      passphraseError: null 
    });
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Create or update user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // New user - create document
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date(),
          lastLogin: new Date(),
        });
        
        console.log('New user created, requiring passphrase creation');
        set({ 
          user,
          isPassphraseRequired: true, 
          passphraseMode: 'create',
          authFlowState: 'generating-keys'
        });
      } else {
        // Existing user - update last login and proceed with key loading
        await updateDoc(userDocRef, {
          lastLogin: new Date(),
        });
        
        set({ user, authFlowState: 'loading-keys' });
        
        // Check for cached session first
        const hasCachedSession = await get().checkCachedSession();
        if (!hasCachedSession) {
          await get().loadKeys();
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      set({ 
        passphraseError: 'Failed to sign in. Please try again.',
        authFlowState: 'idle'
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    const currentState = get();
    
    // Prevent multiple simultaneous sign-out attempts
    if (currentState.isLoading) {
      console.log('Sign-out already in progress');
      return;
    }
    
    set({ isLoading: true, authFlowState: 'idle' });
    
    try {
      const { firestoreUnsubscribe, user } = get();
      
      // Clean up cached keys (async)
      if (user) {
        await keyCache.clearKey(user.uid);
        console.log('Cleared cached decrypted key for user');
      }
      
      // Clean up Firestore subscription
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        set({ firestoreUnsubscribe: null });
      }
      
      // Sign out from Firebase, which will trigger onAuthStateChanged
      await firebaseSignOut(auth);
      
      // Clear all todo-related localStorage data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('todos')) {
          localStorage.removeItem(key);
        }
      });
      
      // Dispatch event to notify UI components
      window.dispatchEvent(new CustomEvent('user-logout-reset'));
      
      console.log('🔄 User signed out and all data cleared');
    } catch (error) {
      console.error('Error signing out:', error);
      set({ passphraseError: 'Failed to sign out. Please try again.' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  syncLocalDataToFirestore: async () => {
    const { user } = get();
    if (!user) return;

    try {
      await firestoreService.syncAllLocalDataToFirestore(user);
      console.log('Local data synced to Firestore');
    } catch (error) {
      console.error('Error syncing local data to Firestore:', error);
    }
  },

  loadUserDataFromFirestore: async (passphrase: string) => {
    const { user, keyOperationInProgress } = get();
    if (!user) {
      console.error('No user available for loading data');
      return;
    }
    
    // Prevent concurrent key operations
    if (keyOperationInProgress) {
      console.log('Key operation already in progress, skipping duplicate request');
      return;
    }

    try {
      set({ 
        passphraseError: null, 
        isLoading: true,
        keyOperationInProgress: true,
        authFlowState: 'loading-keys'
      });
      
      // Get user data from Firebase
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      const storedHash = userData.passphraseHash;
      const storedPrivateKey = userData.encryptedPrivateKey;
      
      console.log('User data from Firebase:', userData);
      
      // Validate that user has required data
      if (!storedHash || !storedPrivateKey) {
        throw new Error('User data incomplete. Please contact support.');
      }

      // Validate passphrase against stored hash
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('Provided hash:', providedHash);
      console.log('Stored hash:', storedHash);
      console.log('Hashes match:', providedHash === storedHash);
      
      if (providedHash !== storedHash) {
        throw new Error('Invalid passphrase');
      }

      // Cache the decrypted private key for the session
      await cacheDecryptedPrivateKey(user.uid, storedPrivateKey, passphrase);
      console.log('Decrypted private key cached for session');

      // Load and decrypt user data using the cached key approach
      const todoLists = await firestoreService.loadAllTodoListsFromFirestore(user, passphrase);
      
      // Populate IndexedDB with the loaded data
      for (const list of Object.values(todoLists)) {
        const todosForStorage = list.todos.map(todo => ({
          text: todo.text,
          completed: todo.completed
        }));
        await indexedDBStorage.setItem(list.storageKey, JSON.stringify(todosForStorage));
      }
      
      // Update todoStore with the loaded data
      const { setTodoLists } = require('@/stores/todoStore').useTodoStore.getState();
      setTodoLists(todoLists);
      
      // Dispatch events to update UI
      window.dispatchEvent(new CustomEvent('todos-updated'));
      
      console.log('User data loaded from Firestore and synced to IndexedDB');
      set({ 
        isPassphraseRequired: false, 
        passphraseError: null,
        isLoading: false,
        authFlowState: 'ready',
        privateKey: storedPrivateKey // Set the private key in state for subscription
      });
      
      // Start Firestore subscription after successful authentication ONLY if not already subscribed
      const { firestoreUnsubscribe: currentSubscription } = get();
      if (user && !currentSubscription) {
        console.log('Starting Firestore subscription after successful authentication...');
        const firestoreUnsubscribe = firestoreService.subscribeToUserTodoLists(user);
        set({ firestoreUnsubscribe });
      } else if (currentSubscription) {
        console.log('Firestore subscription already active, skipping duplicate...');
      }
    } catch (error) {
      console.error('Error loading user data from Firestore:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      set({ 
        passphraseError: errorMessage.includes('Invalid passphrase') 
          ? 'Invalid passphrase. Please try again.'
          : 'Failed to decrypt your data. Please check your passphrase and try again.',
        isLoading: false,
        authFlowState: 'idle'
      });
      throw error;
    } finally {
      set({ keyOperationInProgress: false });
    }
  },

  generateAndStoreKeys: async (passphrase: string) => {
    const { user, keyOperationInProgress } = get();
    if (!user) {
      console.error('No user available for key generation');
      return;
    }
    
    // Prevent concurrent key operations
    if (keyOperationInProgress) {
      console.log('Key operation already in progress, skipping duplicate request');
      return;
    }

    try {
      set({ 
        passphraseError: null,
        keyOperationInProgress: true,
        isLoading: true,
        authFlowState: 'generating-keys'
      });
      
      // Generate private key using deterministic method based on user ID
      const privateKey = await generateDeterministicPrivateKey(user.uid, passphrase);
      
      // Create a hash of the passphrase for validation (not the passphrase itself)
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passphraseHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('Generated passphrase hash:', passphraseHash);
      console.log('Passphrase length:', passphrase.length);
      
      // Store the encrypted private key and passphrase hash in Firebase
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        encryptedPrivateKey: privateKey, // Encrypted private key for encryption/decryption
        passphraseHash, // Hash for validation, not the actual passphrase
        hasEncryptionKeys: true
      });
      
      console.log('Successfully stored private key and passphrase hash to Firebase');
      
      // Cache the decrypted private key for the session
      await cacheDecryptedPrivateKey(user.uid, privateKey, passphrase);
      console.log('Decrypted private key cached for session');
      
      // Update session state
      set({ 
        isPassphraseRequired: false, 
        passphraseError: null,
        authFlowState: 'ready',
        privateKey: privateKey // Set the private key in state for subscription
      });
      
      // Check if this is a new user (no todo lists exist yet)
      const todoListsMetadata = await firestoreService.getAllTodoListsWithMetadata(user);
      if (Object.keys(todoListsMetadata).length === 0) {
        console.log('New user detected, creating default template lists...');
        await get().createDefaultTemplateForNewUser();
      }

      // Start Firestore subscription after successful key generation ONLY if not already subscribed
      const { firestoreUnsubscribe: currentSubscription } = get();
      if (!currentSubscription) {
        console.log('Starting Firestore subscription after key generation...');
        const firestoreUnsubscribe = firestoreService.subscribeToUserTodoLists(user);
        set({ firestoreUnsubscribe });
      } else {
        console.log('Firestore subscription already active, skipping duplicate...');
      }
    } catch (error) {
      console.error('Error generating and storing keys:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      set({ 
        passphraseError: 'Failed to generate encryption keys. Please try again.',
        authFlowState: 'idle'
      });
      throw error;
    } finally {
      set({ 
        isLoading: false,
        keyOperationInProgress: false 
      });
    }
  },

  createDefaultTemplateForNewUser: async () => {
    const { user } = get();
    if (!user) {
      console.error('No user available for creating default template');
      return;
    }

    const defaultLists = [
      { title: 'main', storageKey: 'todos1' },
      { title: 'admin', storageKey: 'todos2' },
      { title: 'study', storageKey: 'todos3' },
      { title: 'work', storageKey: 'todos4' },
      { title: 'project', storageKey: 'todos5' },
      { title: 'hobby', storageKey: 'todos6' },
    ];

    try {
      // Create all lists sequentially to avoid race conditions
      for (const listConfig of defaultLists) {
        const existingTodos = localStorage.getItem(listConfig.storageKey);
        const todos = existingTodos ? JSON.parse(existingTodos) : [];
        
        const todoItems = Array.isArray(todos) ? todos.map((todo, index) => ({
          id: todo.id || `${Date.now()}_${index}`,
          text: todo.text || '',
          completed: todo.completed || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })).filter(todo => todo.text.trim() !== '') : [];

        // Use the correct createTodoList method
        await firestoreService.createTodoList(user, listConfig.title, listConfig.storageKey, todoItems);
        
        // Small delay to prevent overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('✅ Default template lists created for new user');
    } catch (error) {
      console.error('❌ Error creating default template for new user:', error);
      // Don't throw the error as this is not critical for the auth flow
    }
  },

  loadKeys: async () => {
    const { user, keyOperationInProgress } = get();
    if (!user) {
      console.error('No user available for loading keys');
      return;
    }
    
    // Prevent concurrent key operations
    if (keyOperationInProgress) {
      console.log('Key operation already in progress, skipping duplicate request');
      return;
    }

    try {
      set({ keyOperationInProgress: true });
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.encryptedPrivateKey && data.hasEncryptionKeys && data.passphraseHash) {
          // User has keys and passphrase hash, they need to unlock with passphrase
          console.log('User has encryption keys, requiring passphrase to unlock');
          set({ 
            isPassphraseRequired: true,
            passphraseMode: 'unlock',
            authFlowState: 'loading-keys'
          });
        } else {
          // User needs to generate keys for the first time
          console.log('User missing encryption keys, requiring passphrase creation');
          set({ 
            isPassphraseRequired: true,
            passphraseMode: 'create',
            authFlowState: 'generating-keys'
          });
        }
      } else {
        console.error('User document does not exist');
        set({ 
          passphraseError: 'User data not found. Please try signing in again.',
          authFlowState: 'idle'
        });
      }
    } catch (error) {
      console.error('Error loading keys:', error);
      set({ 
        passphraseError: 'Failed to load user data. Please try again.',
        authFlowState: 'idle'
      });
    } finally {
      set({ keyOperationInProgress: false });
    }
  },

  setPassphraseRequired: (isRequired: boolean) => {
    set({ isPassphraseRequired: isRequired });
  },

  clearPassphraseError: () => {
    set({ passphraseError: null });
  },

  checkCachedSession: async () => {
    const { user, firestoreUnsubscribe } = get();
    if (!user) {
      console.log('No user available for checking cached session');
      return false;
    }

    try {
      // Check if we have a cached decrypted private key for this user (async check)
      const hasKey = await keyCache.hasKey(user.uid);
      if (hasKey) {
        console.log('Found cached session, decrypted private key available...');
        
        // Get the encrypted private key from Firestore to set in state
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        let privateKey = null;
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          privateKey = userData.encryptedPrivateKey;
        }
        
        set({ 
          isPassphraseRequired: false,
          authFlowState: 'ready',
          privateKey: privateKey // Set the private key for subscription
        });

        // Start Firestore subscription only if not already subscribed
        if (!firestoreUnsubscribe) {
          console.log('Starting Firestore subscription from cached session...');
          const newFirestoreUnsubscribe = firestoreService.subscribeToUserTodoLists(user);
          set({ firestoreUnsubscribe: newFirestoreUnsubscribe });
        } else {
          console.log('Firestore subscription already active, skipping...');
        }

        return true;
      }
      
      console.log('No cached session found');
      return false;
    } catch (error) {
      console.error('Error checking cached session:', error);
      set({ authFlowState: 'idle' });
      return false;
    }
  }
}));

// Initialize auth state listener when the store is first used, with proper cleanup
let isStoreInitialized = false;

export const initializeAuthStore = () => {
  if (!isStoreInitialized) {
    console.log('Initializing auth store for the first time...');
    useAuthStore.getState().initialize();
    isStoreInitialized = true;
  }
};

// Auto-initialize on import, but allow manual control
if (typeof window !== 'undefined') {
  // Initialize after a short delay to ensure DOM is ready
  setTimeout(() => {
    initializeAuthStore();
  }, 100);
  
  // Clean up auth listeners on page unload
  window.addEventListener('beforeunload', () => {
    const { authUnsubscribe, firestoreUnsubscribe } = useAuthStore.getState();
    if (authUnsubscribe) {
      console.log('Cleaning up auth subscription on page unload');
      authUnsubscribe();
    }
    if (firestoreUnsubscribe) {
      console.log('Cleaning up Firestore subscription on page unload');
      firestoreUnsubscribe();
    }
  });
}

