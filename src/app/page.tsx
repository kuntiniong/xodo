"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/sidebar/Sidebar";
import { useAuthStore } from "@/stores/authStore";
import { useTodoStore } from "@/stores/todoStore";
import { firestoreService } from "@/services/firestoreService";
import { PassphraseDialog } from "@/components/auth/PassphraseDialog";

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

  // Set up real-time subscription when user is authenticated and has passphrase
  useEffect(() => {
    if (!user) return;

    const { passphrase } = useAuthStore.getState();
    if (!passphrase) return;

    console.log('🔄 Setting up real-time Firestore subscription');
    const unsubscribe = firestoreService.subscribeToUserTodoLists(user, (lists) => {
      // Update localStorage when Firestore data changes
      Object.values(lists).forEach(list => {
        const todosForStorage = list.todos.map(todo => ({
          text: todo.text,
          completed: todo.completed
        }));
        localStorage.setItem(list.storageKey, JSON.stringify(todosForStorage));
      });
      
      // Dispatch event to update UI components
      window.dispatchEvent(new CustomEvent('todos-updated'));
    });

    return () => {
      console.log('🔄 Cleaning up Firestore subscription');
      unsubscribe();
    };
  }, [user]);

  const allTodos = Object.values(todoLists).map((list) => {
    const defaultList = defaultTodoLists.find((d) => d.title === list.title);
    return {
      title: list.title,
      storageKey: list.storageKey,
      accentColor: defaultList?.accentColor || "var(--color-gray-dark)",
    };
  });

  const handlePassphraseSubmit = async (passphrase: string) => {
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

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-[1fr_auto] w-full max-w-screen-2xl mx-auto mt-16 gap-8 px-4 lg:px-8">
        <div className="w-full h-96 animate-pulse bg-transparent rounded-lg"></div>
        <Sidebar />
      </div>
    );
  }

  return (
    <>
      <PassphraseDialog
        open={isPassphraseRequired}
        onOpenChange={setPassphraseRequired}
        onSubmit={handlePassphraseSubmit}
        mode={passphraseMode}
        error={passphraseError || undefined}
        isLoading={isLoading}
      />
      <div className="grid lg:grid-cols-[1fr_auto] w-full max-w-screen-2xl mx-auto mt-16 gap-8 px-4 lg:px-8">
        <ClientOnlyTodoGrid allTodos={user ? allTodos : defaultTodoLists} />
        <Sidebar />
      </div>
    </>
  );
}
