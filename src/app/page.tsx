"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/sidebar/Sidebar";
import { useAuthStore } from "@/stores/authStore";
import { firestoreService } from "@/services/firestoreService";

// Dynamically import the new TodoGrid component with SSR disabled.
// This prevents it from running during the server-side build.
const ClientOnlyTodoGrid = dynamic(() => import("@/components/todo/TodoGrid"), {
  ssr: false,
  // Optional: Show a loading skeleton or message while the component loads on the client
  loading: () => (
    <div className="w-full h-96 animate-pulse bg-transparent rounded-lg"></div>
  ),
});

// Default todo lists for new users or when not authenticated
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
  const { user } = useAuthStore();
  const [allTodos, setAllTodos] = useState(defaultTodoLists);
  const [isLoading, setIsLoading] = useState(false);

  // Listen for logout reset event to update UI immediately
  useEffect(() => {
    const handleLogoutReset = () => {
      console.log('🔄 Received logout reset event, reverting to default template');
      setAllTodos(defaultTodoLists);
    };

    window.addEventListener('user-logout-reset', handleLogoutReset);
    return () => {
      window.removeEventListener('user-logout-reset', handleLogoutReset);
    };
  }, []);

  // Load todo lists from Firestore when user is authenticated
  useEffect(() => {
    const loadTodoLists = async () => {
      if (!user) {
        // Use default lists for anonymous users
        setAllTodos(defaultTodoLists);
        return;
      }

      setIsLoading(true);
      try {
        // Get all todo lists with metadata from Firestore
        const todoListsMetadata = await firestoreService.getAllTodoListsWithMetadata(user);
        
        if (Object.keys(todoListsMetadata).length > 0) {
          // Convert Firestore data to the format expected by TodoGrid
          const todoListsArray = Object.values(todoListsMetadata).map((list) => {
            // Find matching default accent color or use a default
            const defaultList = defaultTodoLists.find(d => d.title === list.title);
            return {
              title: list.title,
              storageKey: list.storageKey,
              accentColor: defaultList?.accentColor || "var(--color-gray-dark)",
            };
          });
          
          setAllTodos(todoListsArray);
        } else {
          // No lists in Firestore, create default template lists for new user
          console.log('New user detected, creating default template lists in Firestore...');
          for (const defaultList of defaultTodoLists) {
            // Get existing localStorage data for this storage key
            const existingTodos = localStorage.getItem(defaultList.storageKey);
            const todos = existingTodos ? JSON.parse(existingTodos) : [];
            
            await firestoreService.createTodoList(
              user,
              defaultList.title,
              defaultList.storageKey,
              todos
            );
          }
          // Keep using the default template
          setAllTodos(defaultTodoLists);
        }
      } catch (error) {
        console.error('Error loading todo lists from Firestore:', error);
        // Fallback to default template on error
        setAllTodos(defaultTodoLists);
      } finally {
        setIsLoading(false);
      }
    };

    loadTodoLists();
  }, [user]);

  // Listen for Firestore data changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestoreService.subscribeToUserTodoLists(
      user,
      (lists) => {
        // Update the todo lists when Firestore data changes
        // This includes both default template lists and any custom lists
        const todoListsArray = Object.entries(lists).map(([title, { storageKey }]) => {
          const defaultList = defaultTodoLists.find(d => d.title === title);
          return {
            title,
            storageKey,
            // Use template accent color for default lists, gray for custom lists
            accentColor: defaultList?.accentColor || "var(--color-gray-dark)",
          };
        });
        
        if (todoListsArray.length > 0) {
          setAllTodos(todoListsArray);
        }
      }
    );

    return unsubscribe;
  }, [user]);

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-[1fr_auto] w-full max-w-screen-2xl mx-auto mt-16 gap-8 px-4 lg:px-8">
        <div className="w-full h-96 animate-pulse bg-transparent rounded-lg"></div>
        <Sidebar />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_auto] w-full max-w-screen-2xl mx-auto mt-16 gap-8 px-4 lg:px-8">
      {/* 
        Render the client-only component here. 
        It will only appear on the client-side, avoiding the build error.
      */}
      <ClientOnlyTodoGrid allTodos={allTodos} />

      <Sidebar />
    </div>
  );
}