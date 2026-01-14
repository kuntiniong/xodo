"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const initialize = useAuthStore((state) => state.initialize);

  // Initialize authentication
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Enable Firestore sync hooks
  useFirestoreSync();

  return <>{children}</>;
};
