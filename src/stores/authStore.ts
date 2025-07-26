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
import { generateKeyPair, generateDeterministicKeyPair, decryptData, validatePassphraseWithPrivateKey } from '@/lib/openpgp';
import { secureKeyStorage } from '@/lib/secureStorage';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  publicKey: string | null;
  privateKey: string | null;
  passphrase?: string;
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
  publicKey: null,
  privateKey: null,
  passphrase: undefined,
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
          publicKey: null,
          privateKey: null,
          passphrase: undefined,
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
      
      // Clean up cached keys
      if (user) {
        await secureKeyStorage.clearAllKeys();
        console.log('Cleared all cached session data');
      }
      
      // Clean up Firestore subscription
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
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
    const { user, publicKey } = get();
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

      // Set the private key in memory
      set({ privateKey: storedPrivateKey });
      
      // Cache the keys securely for session persistence
      await secureKeyStorage.storePrivateKey(user.uid, storedPrivateKey, passphrase);
      console.log('Keys cached securely for session persistence');

      // Load and decrypt user data
      const todoLists = await firestoreService.loadAllTodoListsFromFirestore(user, passphrase);
      
      // Populate localStorage with the loaded data
      Object.values(todoLists).forEach(list => {
        const todosForStorage = list.todos.map(todo => ({
          text: todo.text,
          completed: todo.completed
        }));
        localStorage.setItem(list.storageKey, JSON.stringify(todosForStorage));
      });
      
      // Update todoStore with the loaded data
      const { setTodoLists } = require('@/stores/todoStore').useTodoStore.getState();
      setTodoLists(todoLists);
      
      // Dispatch events to update UI
      window.dispatchEvent(new CustomEvent('todos-updated'));
      
      console.log('User data loaded from Firestore and synced to localStorage');
      set({ 
        isPassphraseRequired: false, 
        passphrase: passphrase,
        passphraseError: null,
        isLoading: false
      });
      
      // Start Firestore subscription after successful authentication
      if (user) {
        console.log('Starting Firestore subscription after successful authentication...');
        const firestoreUnsubscribe = firestoreService.subscribeToUserTodoLists(user);
        set({ firestoreUnsubscribe });
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
      
      // Generate keys using deterministic method based on user ID
      const { privateKey, publicKey } = await generateDeterministicKeyPair(user.uid, passphrase);
      
      // Create a hash of the passphrase for validation (not the passphrase itself)
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passphraseHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('Generated passphrase hash:', passphraseHash);
      console.log('Passphrase length:', passphrase.length);
      
      // Only store the PUBLIC key and passphrase hash in Firebase
      // The private key will be encrypted and stored as well
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        publicKey, // Public key for encrypting new data
        encryptedPrivateKey: privateKey, // Encrypted private key for decryption
        passphraseHash, // Hash for validation, not the actual passphrase
        hasEncryptionKeys: true
      });
      
      console.log('Successfully stored public key and passphrase hash to Firebase');
      
      // Store keys in memory for this session only
      set({ 
        publicKey, 
        privateKey, 
        isPassphraseRequired: false, 
        passphrase,
        passphraseError: null
      });
      
      // Check if this is a new user (no todo lists exist yet)
      const todoListsMetadata = await firestoreService.getAllTodoListsWithMetadata(user);
      if (Object.keys(todoListsMetadata).length === 0) {
        console.log('New user detected, creating default template lists...');
        await get().createDefaultTemplateForNewUser();
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
      for (const listConfig of defaultLists) {
        // Get any existing localStorage data
        const existingTodos = localStorage.getItem(listConfig.storageKey);
        const todos = existingTodos ? JSON.parse(existingTodos) : [];
        
        // Create the list in Firestore
        await firestoreService.createTodoList(
          user,
          listConfig.title,
          listConfig.storageKey,
          Array.isArray(todos) ? todos.map((todo, index) => ({
            id: todo.id || `${Date.now()}_${index}`,
            text: todo.text || '',
            completed: todo.completed || false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })) : []
        );
      }
      
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
        if (data.publicKey && data.hasEncryptionKeys && data.passphraseHash) {
          // User has keys and passphrase hash, they need to unlock with passphrase
          set({ 
            publicKey: data.publicKey,
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
    const { user } = get();
    if (!user) return false;

    try {
      // Check if we have cached keys for this user
      const cachedData = await secureKeyStorage.getPrivateKey(user.uid);
      if (cachedData) {
        console.log('Found cached session, restoring keys...');
        set({ 
          privateKey: cachedData.privateKey,
          passphrase: cachedData.passphrase,
          isPassphraseRequired: false 
        });

        // Start Firestore subscription
        const firestoreUnsubscribe = firestoreService.subscribeToUserTodoLists(user);
        set({ firestoreUnsubscribe });

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

