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

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncLocalDataToFirestore: () => Promise<void>;
  loadUserDataFromFirestore: () => Promise<void>;
  initialize: () => void;
}

let authUnsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  initialize: () => {
    if (authUnsubscribe) {
      authUnsubscribe();
    }
    
    authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ user, isInitialized: true });
      
      if (user) {
        // Load user data from Firestore when user signs in
        await get().loadUserDataFromFirestore();
      }
    });
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
        // New user - create document and sync local data
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date(),
          lastLogin: new Date(),
        });
        
        // Sync local storage data to Firestore
        await get().syncLocalDataToFirestore();
      } else {
        // Existing user - update last login
        await updateDoc(userDocRef, {
          lastLogin: new Date(),
        });
        
        // Load user data from Firestore
        await get().loadUserDataFromFirestore();
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
      await firebaseSignOut(auth);
      set({ user: null });
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

  loadUserDataFromFirestore: async () => {
    const { user } = get();
    if (!user) return;

    try {
      await firestoreService.loadAllTodoListsFromFirestore(user);
      console.log('User data loaded from Firestore');
    } catch (error) {
      console.error('Error loading user data from Firestore:', error);
    }
  },
}));
