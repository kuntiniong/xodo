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
import { generatePrivateKey, generateDeterministicPrivateKey, decryptDataWithPassphrase, cacheDecryptedPrivateKey, validatePassphraseWithPrivateKey } from '@/lib/openpgp';
import { secureKeyStorage } from '@/lib/secureStorage';
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

  initialize: () => {
    // Clean up any existing auth subscription
    const { authUnsubscribe } = get();
    if (authUnsubscribe) {
      authUnsubscribe();
    }
    
    const newAuthUnsubscribe = onAuthStateChanged(auth, async (user) => {
      const currentUser = get().user;
      
      // Skip if this is the same user (prevents redundant operations on page reload)
      if (currentUser && user && currentUser.uid === user.uid) {
        console.log('Same user detected, skipping redundant authentication processing');
        set({ isInitialized: true });
        return;
      }
      
      set({ user, isInitialized: true });
      
      if (user) {
        // Check for a cached session first to avoid asking for the passphrase unnecessarily
        const hasCachedSession = await get().checkCachedSession();
        
        if (hasCachedSession) {
          console.log('Cached session restored successfully');
        } else {
          // No cached session, so we need to load keys and potentially ask for a passphrase
          console.log('No cached session found, proceeding to load keys from Firestore');
          await get().loadKeys();
        }
      } else {
        // User is logged out, reset the state to its initial values
        set({
          user: null,
          isLoading: false,
          isInitialized: true,
          privateKey: null,
          isPassphraseRequired: false,
          passphraseMode: 'unlock',
          passphraseError: null,
          firestoreUnsubscribe: null,
        });
      }
    });
    
    // Store the auth unsubscribe function
    set({ authUnsubscribe: newAuthUnsubscribe });
  },

  signInWithGoogle: async () => {
    set({ isLoading: true });
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
        
        // This is a new user, they need to generate keys.
        // The UI will prompt for a passphrase.
        set({ isPassphraseRequired: true, passphraseMode: 'create' });
        
        console.log('New user created, will need to generate keys and create default template');
      } else {
        // Existing user - update last login and load keys
        await updateDoc(userDocRef, {
          lastLogin: new Date(),
        });
        
        await get().loadKeys();
      }
      
      set({ user });
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      const { firestoreUnsubscribe, user } = get();
      
      // Clean up cached keys (async)
      if (user) {
        await keyCache.clearKey(user.uid);
        console.log('Cleared cached decrypted key for user');
      }
      
      // Clean up Firestore subscription and cache
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
      
      // Clear Firestore service cache
      firestoreService.clearCache();
      
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
    const { user } = get();
    if (!user) return;

    try {
      set({ passphraseError: null, isLoading: true });
      
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
      const todoLists = await firestoreService.loadAllTodoListsFromFirestore(user);
      
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
        isLoading: false
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
      set({ 
        passphraseError: 'Failed to decrypt your data. Please check your passphrase and try again.',
        isLoading: false
      });
      throw error;
    }
  },

  generateAndStoreKeys: async (passphrase: string) => {
    const { user } = get();
    if (!user) return;

    try {
      set({ passphraseError: null });
      
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
      
      // Update session state
      set({ 
        isPassphraseRequired: false, 
        passphraseError: null
      });

      // Cache the decrypted private key for the session
      await cacheDecryptedPrivateKey(user.uid, privateKey, passphrase);
      console.log('Decrypted private key cached for session');
      
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
      set({ passphraseError: 'Failed to generate encryption keys. Please try again.' });
      throw error;
    }
  },

  createDefaultTemplateForNewUser: async () => {
    const { user } = get();
    if (!user) return;

    const defaultLists = [
      { title: 'main', storageKey: 'todos1' },
      { title: 'admin', storageKey: 'todos2' },
      { title: 'study', storageKey: 'todos3' },
      { title: 'work', storageKey: 'todos4' },
      { title: 'project', storageKey: 'todos5' },
      { title: 'hobby', storageKey: 'todos6' },
    ];

    try {
      // Prepare lists with existing localStorage data
      const listsWithData = defaultLists.map(listConfig => {
        const existingTodos = localStorage.getItem(listConfig.storageKey);
        const todos = existingTodos ? JSON.parse(existingTodos) : [];
        
        return {
          ...listConfig,
          todos: Array.isArray(todos) ? todos.map((todo, index) => ({
            id: todo.id || `${Date.now()}_${index}`,
            text: todo.text || '',
            completed: todo.completed || false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })) : []
        };
      });

      // Create all lists in batch to minimize Firestore subscription triggers
      await firestoreService.createMultipleTodoListsBatch(user, listsWithData);
      
      console.log('✅ Default template lists created for new user');
    } catch (error) {
      console.error('❌ Error creating default template for new user:', error);
    }
  },

  loadKeys: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.encryptedPrivateKey && data.hasEncryptionKeys && data.passphraseHash) {
          // User has keys and passphrase hash, they need to unlock with passphrase
          set({ 
            isPassphraseRequired: true,
            passphraseMode: 'unlock'
          });
        } else {
          // User needs to generate keys for the first time
          set({ 
            isPassphraseRequired: true,
            passphraseMode: 'create'
          });
        }
      }
    } catch (error) {
      console.error('Error loading keys:', error);
      set({ passphraseError: 'Failed to load user data. Please try again.' });
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
    if (!user) return false;

    try {
      // Check if we have a cached decrypted private key for this user (async check)
      const hasKey = await keyCache.hasKey(user.uid);
      if (hasKey) {
        console.log('Found cached session, decrypted private key available...');
        
        set({ 
          isPassphraseRequired: false 
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
      return false;
    } catch (error) {
      console.error('Error checking cached session:', error);
      return false;
    }
  }
}));

// Initialize auth state listener when the store is first used
useAuthStore.getState().initialize();

