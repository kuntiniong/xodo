"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/sidebar/Sidebar";
import { useAuthStore } from "@/stores/authStore";
import { useTodoStore } from "@/stores/todoStore";
import { firestoreService } from "@/services/firestoreService";
import { PassphraseDialog } from "@/components/auth/PassphraseDialog";
import { indexedDBStorage } from "@/lib/indexedDBStorage";

const ClientOnlyTodoGrid = dynamic(() => import("@/components/todo/TodoGrid"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 animate-pulse bg-transparent rounded-lg"></div>
  ),
});

const defaultTodoLists = [
  {
    title: "main",
    storageKey: "todos1",
    accentColor: "var(--color-green-dark)",
  },
  {
    title: "admin",
    storageKey: "todos2",
    accentColor: "var(--color-red-dark)",
  },
  {
    title: "study",
    storageKey: "todos3",
    accentColor: "var(--color-yellow-dark)",
  },
  {
    title: "work",
    storageKey: "todos4",
    accentColor: "var(--color-blue-dark)",
  },
  {
    title: "project",
    storageKey: "todos5",
    accentColor: "var(--color-purple-dark)",
  },
  {
    title: "hobby",
    storageKey: "todos6",
    accentColor: "var(--color-orange-dark)",
  },
];

export default function Home() {
  const { 
    user, 
    isPassphraseRequired, 
    passphraseMode,
    passphraseError,
    authFlowState,
    generateAndStoreKeys, 
    loadUserDataFromFirestore, 
    setPassphraseRequired,
    clearPassphraseError,
    isLoading: authLoading
  } = useAuthStore();
  const { todoLists, setTodoLists } = useTodoStore();
  const [isLoading, setIsLoading] = useState(false);

  // Listen for logout reset event to clear todoStore
  useEffect(() => {
    const handleLogoutReset = () => {
      console.log('🔄 Received logout reset event, clearing todoStore');
      setTodoLists({});
    };

    window.addEventListener('user-logout-reset', handleLogoutReset);
    return () => {
      window.removeEventListener('user-logout-reset', handleLogoutReset);
    };
  }, [setTodoLists]);

  const allTodos = Object.values(todoLists).map((list) => {
    const defaultList = defaultTodoLists.find((d) => d.title === list.title);
    return {
      title: list.title,
      storageKey: list.storageKey,
      accentColor: defaultList?.accentColor || "var(--color-gray-dark)",
    };
  });

  const handlePassphraseSubmit = async (passphrase: string) => {
    // Prevent multiple simultaneous submissions
    if (isLoading || authLoading) {
      console.log('Passphrase submission already in progress');
      return;
    }
    
    setIsLoading(true);
    clearPassphraseError();
    
    try {
      if (passphraseMode === 'create') {
        await generateAndStoreKeys(passphrase);
      } else {
        await loadUserDataFromFirestore(passphrase);
      }
    } catch (error) {
      console.error('Error handling passphrase:', error);
      // Error is handled in the authStore and set as passphraseError
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state during authentication flow
  if (authLoading || authFlowState === 'signing-in' || authFlowState === 'loading-keys') {
    return (
      <div className="grid lg:grid-cols-[auto_1fr] w-full max-w-screen-2xl mx-auto mt-16 gap-8 px-4 lg:px-8">
        <Sidebar />
        <div className="w-full h-96 animate-pulse bg-transparent rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">
              {authFlowState === 'signing-in' && 'Signing in...'}
              {authFlowState === 'loading-keys' && 'Loading your data...'}
              {authFlowState === 'generating-keys' && 'Setting up your account...'}
            </div>
            <div className="text-sm text-gray-500">Please wait</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PassphraseDialog
        open={isPassphraseRequired}
        onOpenChange={(open) => {
          // Only allow closing if not in a critical auth flow state
          if (!open && !isLoading && !['generating-keys', 'loading-keys', 'signing-in'].includes(authFlowState)) {
            setPassphraseRequired(false);
          }
        }}
        onSubmit={handlePassphraseSubmit}
        mode={passphraseMode}
        error={passphraseError || undefined}
        isLoading={isLoading}
      />
      <div className="grid lg:grid-cols-[auto_1fr] w-full max-w-screen-2xl mx-auto mt-16 gap-8 px-4 lg:px-8">
        <Sidebar />
        <ClientOnlyTodoGrid allTodos={user ? allTodos : defaultTodoLists} />
      </div>
    </>
  );
}
