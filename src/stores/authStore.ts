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
  updateDoc
} from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { firestoreService } from '@/services/firestoreService';
import { generateDeterministicPrivateKey, generateDeterministicKeyMaterial } from '@/lib/crypto';
import { indexedDBStorage } from '@/lib/indexedDBStorage';
import { keyCache } from '@/lib/keyCache';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isPassphraseRequired: boolean;
  passphraseMode: 'create' | 'unlock';
  passphraseError: string | null;
  authUnsubscribe?: (() => void) | null;
  firestoreUnsubscribe?: (() => void) | null;
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
  createDefaultTemplateForNewUser: (passphrase: string) => Promise<void>;
  clearPassphraseError: () => void;
  checkCachedSession: () => Promise<boolean>;
  startFirestoreSubscription: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  isPassphraseRequired: false,
  passphraseMode: 'unlock',
  passphraseError: null,
  authUnsubscribe: null,
  firestoreUnsubscribe: null,
  authFlowState: 'idle',
  keyOperationInProgress: false,
  lastAuthAttempt: 0,

  initialize: () => {
    const state = get();
    
    if (state.authUnsubscribe) {
      console.log('Auth already initialized, skipping duplicate initialization');
      return;
    }
    
    console.log('Initializing authentication state management...');
    
    const newAuthUnsubscribe = onAuthStateChanged(auth, async (user) => {
      const currentState = get();
      
      if (currentState.user && user && currentState.user.uid === user.uid && currentState.isInitialized) {
        console.log('Same user detected, skipping redundant authentication processing');
        return;
      }
      
      set({ isLoading: true, authFlowState: 'loading-keys' });
      
      try {
        if (user) {
          console.log('User authenticated:', user.uid);
          set({ user, isInitialized: true });
          
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
          if (currentState.firestoreUnsubscribe) {
            currentState.firestoreUnsubscribe();
          }
          
          set({
            user: null,
            isLoading: false,
            isInitialized: true,
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
    
    set({ authUnsubscribe: newAuthUnsubscribe });
  },

  signInWithGoogle: async () => {
    const currentState = get();
    
    const now = Date.now();
    if (currentState.isLoading || currentState.authFlowState === 'signing-in') {
      console.log('Sign-in already in progress, ignoring duplicate request');
      return;
    }
    
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
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
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
        await updateDoc(userDocRef, {
          lastLogin: new Date(),
        });
        
        set({ user, authFlowState: 'loading-keys' });
        
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
    
    if (currentState.isLoading) {
      console.log('Sign-out already in progress');
      return;
    }
    
    set({ isLoading: true, authFlowState: 'idle' });
    
    try {
      const { firestoreUnsubscribe, user } = get();
      
      if (user) {
        console.log('Clearing session data');
        // Clear cached keys on logout
        await keyCache.clearKey(user.uid);
      }
      
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        set({ firestoreUnsubscribe: null });
      }
      
      await firebaseSignOut(auth);
      
      const allKeys = await indexedDBStorage.getAllKeys();
      for (const key of allKeys) {
        if (key.startsWith('todos')) {
          await indexedDBStorage.removeItem(key);
        }
      }
      
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
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('User document not found - user may need to create their encryption keys first');
        set({ 
          passphraseError: 'No encryption data found. Please create your passphrase first.',
          isPassphraseRequired: true,
          passphraseMode: 'create',
          authFlowState: 'generating-keys'
        });
        return;
      }

      const userData = userDoc.data();
      const storedHash = userData.passphraseHash;
      const storedPrivateKey = userData.encryptedPrivateKey;
      
      if (!storedHash || !storedPrivateKey) {
        console.log('User data incomplete - missing encryption keys or passphrase hash');
        set({ 
          passphraseError: 'Encryption data is incomplete. Please create your passphrase again.',
          isPassphraseRequired: true,
          passphraseMode: 'create',
          authFlowState: 'generating-keys'
        });
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (providedHash !== storedHash) {
        throw new Error('Invalid passphrase');
      }

      // Single source of truth: Cache the key material once after successful passphrase validation
      const keyMaterial = await generateDeterministicKeyMaterial(user.uid, passphrase);
      const aesKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial.buffer as ArrayBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      // This is the ONLY place we cache the key - no redundant calls
      await keyCache.setDecryptedKeyWithMaterial(user.uid, aesKey, keyMaterial);

      const todoLists = await firestoreService.loadAllTodoListsFromFirestore(user, passphrase);
      
      for (const list of Object.values(todoLists)) {
        const todosForStorage = list.todos.map(todo => ({
          text: todo.text,
          completed: todo.completed
        }));
        await indexedDBStorage.setItem(list.storageKey, JSON.stringify(todosForStorage));
      }
      
      const { setTodoLists } = require('@/stores/todoStore').useTodoStore.getState();
      setTodoLists(todoLists);
      
      window.dispatchEvent(new CustomEvent('todos-updated'));
      
      console.log('User data loaded from Firestore and synced to IndexedDB');
      set({ 
        isPassphraseRequired: false, 
        passphraseError: null,
        isLoading: false,
        authFlowState: 'ready'
      });
      
      get().startFirestoreSubscription();
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
      
      const privateKey = await generateDeterministicPrivateKey(user.uid, passphrase);
      
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passphraseHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        encryptedPrivateKey: privateKey,
        passphraseHash,
        hasEncryptionKeys: true
      });
      
      console.log('Successfully stored private key and passphrase hash to Firebase');
      
      // Cache the key material in memory and IndexedDB for this session
      const keyMaterial = await generateDeterministicKeyMaterial(user.uid, passphrase);
      const aesKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial.buffer as ArrayBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      await keyCache.setDecryptedKeyWithMaterial(user.uid, aesKey, keyMaterial);
      
      set({ 
        isPassphraseRequired: false, 
        passphraseError: null,
        authFlowState: 'ready'
      });
      
      // Check if this is a new user (no data in Firestore yet)
      const todoListsMetadata = await firestoreService.getAllTodoListsWithMetadata(user);
      if (Object.keys(todoListsMetadata).length === 0) {
        console.log('New user detected, creating and storing default template lists...');
        await get().createDefaultTemplateForNewUser(passphrase);
      }

      get().startFirestoreSubscription();
    } catch (error) {
      console.error('Error generating and storing keys:', error);
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

  createDefaultTemplateForNewUser: async (passphrase: string) => {
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

        await firestoreService.createTodoList(user, listConfig.title, listConfig.storageKey, todoItems, passphrase);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('✅ Default template lists created for new user');
    } catch (error) {
      console.error('❌ Error creating default template for new user:', error);
    }
  },

  loadKeys: async () => {
    const { user, keyOperationInProgress } = get();
    if (!user) {
      console.error('No user available for loading keys');
      return;
    }
    
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
          console.log('User has encryption keys, requiring passphrase to unlock');
          set({ 
            isPassphraseRequired: true,
            passphraseMode: 'unlock',
            authFlowState: 'loading-keys'
          });
        } else {
          console.log('User missing encryption keys, requiring passphrase creation');
          set({ 
            isPassphraseRequired: true,
            passphraseMode: 'create',
            authFlowState: 'generating-keys'
          });
        }
      } else {
        console.log('New user detected - no user document exists yet, requiring passphrase creation');
        set({ 
          isPassphraseRequired: true,
          passphraseMode: 'create',
          authFlowState: 'generating-keys',
          passphraseError: null
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
    const { user } = get();
    if (!user) {
      console.log('No user available for checking cached session');
      return false;
    }

    try {
      // Since keys are no longer cached, user must re-enter passphrase on every refresh
      console.log('No cached keys available - passphrase required');
      set({ 
        isPassphraseRequired: true,
        passphraseMode: 'unlock',
        authFlowState: 'idle'
      });

      return false;
    } catch (error) {
      console.error('Error checking cached session:', error);
      set({ authFlowState: 'idle' });
      return false;
    }
  },

  startFirestoreSubscription: () => {
    // Listener disabled; no-op to prevent loops/log spam
    set({ firestoreUnsubscribe: undefined });
  }
}));

let isStoreInitialized = false;

export const initializeAuthStore = () => {
  if (!isStoreInitialized) {
    console.log('Initializing auth store for the first time...');
    useAuthStore.getState().initialize();
    isStoreInitialized = true;
  }
};

if (typeof window !== 'undefined') {
  setTimeout(() => {
    initializeAuthStore();
  }, 100);
  
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

