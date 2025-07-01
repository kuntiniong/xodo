"use client";

import React, { useEffect, useState } from "react";
import ShadowIn from "@/components/animations/ShadowIn";
import DecryptedText from "@/components/animations/DecryptedText";

// Todo interface remains the same
export interface Todo {
  text: string;
  completed: boolean;
}

// ==================================================================
// MODIFICATION: Replaced cookie functions with localStorage functions
// ==================================================================

/**
 * Retrieves the list of todos from localStorage.
 * @param key The key to use for storing the todos in localStorage.
 * @returns An array of Todo items.
 */
function getTodosFromLocalStorage(key: string): Todo[] {
  // Check for SSR environments where `window` is not defined.
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  
  const savedTodos = window.localStorage.getItem(key);
  if (!savedTodos) {
    return [];
  }

  try {
    // Parse the stored JSON string back into an array.
    const parsed = JSON.parse(savedTodos);
    
    // Validate that the parsed data is an array
    if (!Array.isArray(parsed)) {
      console.warn(`Invalid todos data format for key ${key}:`, parsed);
      return [];
    }
    
    // Validate that each item has the expected Todo structure
    const validTodos = parsed.filter((item: any) => {
      return item && 
             typeof item === 'object' && 
             typeof item.text === 'string' && 
             typeof item.completed === 'boolean';
    });
    
    // If some items were filtered out, log a warning
    if (validTodos.length !== parsed.length) {
      console.warn(`Filtered out ${parsed.length - validTodos.length} invalid todo items from ${key}`);
    }
    
    return validTodos;
  } catch (error) {
    console.error("Failed to parse todos from localStorage:", error);
    return [];
  }
}

/**
 * Saves the list of todos to localStorage.
 * @param key The key to use for storing the todos.
 * @param todos The array of Todo items to save.
 */
function setTodosToLocalStorage(key: string, todos: Todo[]) {
  // Check for SSR environments.
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  
  // Validate that todos is an array before saving
  if (!Array.isArray(todos)) {
    console.error("Cannot save todos: expected array but got:", typeof todos);
    return;
  }
  
  try {
    // Convert the todos array to a JSON string and save it.
    window.localStorage.setItem(key, JSON.stringify(todos));
  } catch (error) {
    console.error("Failed to save todos to localStorage:", error);
  }
}


// The gradient utility functions remain unchanged.
const gradientMap = {
  tealPurple: "linear-gradient(135deg, #3A5A5A, #5A3A5A)",
  oliveGreen: "linear-gradient(135deg, #5A5A3A, #3A5A3A)",
  pinkOrange: "linear-gradient(135deg, #80405F, #806020)",
  blueRed: "linear-gradient(135deg, #4A4A6A, #6A4A4A)",
  mono: "linear-gradient(135deg, #222222 0%, #888888 100%)",
  midnightPeach: "linear-gradient(135deg, #3B2C35, #7D6F5B)",
  duskyMint: "linear-gradient(135deg, #2D3A3A, #6EB7A3)",
  mauveOlive: "linear-gradient(135deg, #4B3A4E, #7A8450)",
  stormyLavender: "linear-gradient(135deg, #34344E, #A3A1C6)",
  slateRose: "linear-gradient(135deg, #3A3F4A, #B07A8C)",
} as const;
type GradientKey = keyof typeof gradientMap;
const gradientKeys = Object.keys(gradientMap) as GradientKey[];
function getRandomGradient() {
  const idx = Math.floor(Math.random() * gradientKeys.length);
  return gradientMap[gradientKeys[idx]];
}

// MODIFICATION: Renamed `cookieKey` prop to `storageKey` for clarity.
export function TodoList({ title, storageKey, className, accentColor = '#000000' }: { title: string; storageKey: string; className?: string; accentColor?: string }) {
  const [mounted, setMounted] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [gradientsForTodos, setGradientsForTodos] = useState<string[]>([]);

  // This effect runs once on mount to indicate client-side rendering.
  useEffect(() => {
    setMounted(true);
  }, []);

  // This effect loads the initial todos from localStorage once the component is mounted.
  useEffect(() => {
    if (mounted) {
      // MODIFICATION: Call the new localStorage function with additional safety check.
      const loadedTodos = getTodosFromLocalStorage(storageKey);
      
      // Ensure we always have an array, even if something went wrong
      if (Array.isArray(loadedTodos)) {
        setTodos(loadedTodos);
      } else {
        console.warn(`Loaded todos is not an array for ${storageKey}, resetting to empty array`);
        setTodos([]);
      }
      
      setHasLoaded(true);
    }
  }, [storageKey, mounted]);

  // This effect saves the todos to localStorage whenever they change.
  useEffect(() => {
    // Ensure we only save after initial load and on the client.
    if (hasLoaded && mounted) {
      // MODIFICATION: Call the new localStorage function.
      setTodosToLocalStorage(storageKey, todos);
      // This event can be used by other components to react to todo list changes.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("todos-updated"));
      }
    }
  }, [todos, storageKey, hasLoaded, mounted]);

  // This effect manages the random gradients for each todo item.
  useEffect(() => {
    if (mounted && Array.isArray(todos)) {
      setGradientsForTodos((prev) => {
        if (prev.length === todos.length && todos.every((t, i) => prev[i] && t.text === todos[i].text)) {
          return prev;
        }
        const newGradients: string[] = [];
        todos.forEach((todo, idx) => {
          const prevIdx = prev.findIndex((_, i) => todos[idx].text === todos[i].text);
          if (prevIdx !== -1 && prev[prevIdx]) {
            newGradients.push(prev[prevIdx]);
          } else {
            newGradients.push(getRandomGradient());
          }
        });
        return newGradients;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, mounted]);

  // Listen for Firestore sync updates
  useEffect(() => {
    const handleFirestoreUpdate = (event: any) => {
      const { storageKey: updatedStorageKey, todos: updatedTodos } = event.detail;
      // Only update if this is for our specific storage key
      if (updatedStorageKey === storageKey) {
        console.log(`🔄 Firestore sync update received for ${title}, updating todos`);
        setTodos(Array.isArray(updatedTodos) ? updatedTodos : []);
      }
    };

    window.addEventListener('firestore-sync-update', handleFirestoreUpdate);
    return () => {
      window.removeEventListener('firestore-sync-update', handleFirestoreUpdate);
    };
  }, [storageKey, title]);

  // Listen for logout reset event to clear todos
  useEffect(() => {
    const handleLogoutReset = () => {
      console.log(`🔄 Logout reset detected for ${title}, reloading from localStorage`);
      // Reload todos from localStorage (which should now be empty after logout)
      const loadedTodos = getTodosFromLocalStorage(storageKey);
      setTodos(Array.isArray(loadedTodos) ? loadedTodos : []);
    };

    window.addEventListener('user-logout-reset', handleLogoutReset);
    return () => {
      window.removeEventListener('user-logout-reset', handleLogoutReset);
    };
  }, [storageKey, title]);

  // Listen for todo-command-internal events
  useEffect(() => {
    const handler = (e: any) => {
      const cmd = e.detail;
      // Only act on commands for this list
      if (
        cmd.type === "cd" &&
        (cmd.args?.listId === title ||
          cmd.args?.listName === title ||
          cmd.args?.listInitial?.toLowerCase() === title[0].toLowerCase())
      ) {
        // Scroll to this list
        const el = document.getElementById(title);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if ((cmd.type === "add" || cmd.type === "touch") && (cmd.args?.listName === title || cmd.args?.listInitial?.toLowerCase() === title[0].toLowerCase())) {
        setTodos(prevTodos => {
          // Ensure prevTodos is always an array
          const safeTodos = Array.isArray(prevTodos) ? prevTodos : [];
          return [...safeTodos, { text: cmd.args.taskName, completed: false }];
        });
      }
      if (cmd.type === "rm" && (cmd.args?.listName === title || cmd.args?.listInitial?.toLowerCase() === title[0].toLowerCase())) {
        setTodos((prev) => {
          // Ensure prev is always an array
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.filter((_, i) => i !== (cmd.args.taskId - 1));
        });
      }
      if (cmd.type === "rm-done" && (cmd.args?.listName === title || cmd.args?.listInitial?.toLowerCase() === title[0].toLowerCase())) {
        setTodos((prev) => {
          // Ensure prev is always an array
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.map((todo, i) => i === (cmd.args.taskId - 1) ? { ...todo, completed: true } : todo);
        });
      }
    };
    window.addEventListener("todo-command-internal", handler);
    return () => window.removeEventListener("todo-command-internal", handler);
  }, [title, todos]);

  // Prevent rendering on the server or before the initial client-side mount.
  if (!mounted) {
    return null;
  }
  
  // Component logic for adding, removing, and toggling todos remains the same.
  const addTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Ensure todos is always an array before spreading
    const safeTodos = Array.isArray(todos) ? todos : [];
    setTodos([...safeTodos, { text: input.trim(), completed: false }]);
    setInput("");
  };

  const removeTodo = (idx: number) => {
    // Ensure todos is always an array before filtering
    const safeTodos = Array.isArray(todos) ? todos : [];
    setTodos(safeTodos.filter((_, i) => i !== idx));
  };

  const toggleTodo = (idx: number) => {
    // Ensure todos is always an array before mapping
    const safeTodos = Array.isArray(todos) ? todos : [];
    setTodos(
      safeTodos.map((todo, i) =>
        i === idx ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Ensure todos is always an array before filtering for remaining count
  const safeTodosForCount = Array.isArray(todos) ? todos : [];
  const remaining = safeTodosForCount.filter((t) => !t.completed).length;

  // The JSX rendering structure remains unchanged.
  return (
    <ShadowIn className="w-full" shadowColor="white">
      <div id={title} className={`card flex flex-col items-center justify-center bg-background text-foreground p-8 max-w-2xl w-full mx-auto relative overflow-hidden ${className ?? ''}`}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 200,
            height: 80,
            background: accentColor,
            borderTopRightRadius: 24,
            transform: 'translate(30%,-110%) rotate(45deg)',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
          aria-hidden="true"
        />
        <main className="flex flex-col gap-6 w-full max-w-md">
          <h1 className="title text-5xl text-left my-2">
            <DecryptedText text={title} animateOn="view" className="title" speed={50} maxIterations={20} />
          </h1>
          
          <form
            onSubmit={addTodo}
            className="flex w-full gap-2 items-center border-b border-foreground pb-2 mb-2"
          >
            <input
              className="flex-1 outline-none border-none bg-transparent text-lg placeholder-foreground-muted text-foreground custom-font-nothing"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="add new task"
              aria-label="Add new task"
            />
            <button
              type="submit"
              className="btn w-9 h-9 flex items-center justify-center rounded-full bg-foreground-muted hover:bg-foreground/20 text-2xl font-bold"
              aria-label="Add task"
            >
              +
            </button>
          </form>
          <ul className="w-full flex flex-col gap-4">
            {Array.isArray(todos) && todos.length === 0 && (
              <li className="text-background-muted text-center custom-font-nothing text-lg">
                no todos yet.
              </li>
            )}
            {Array.isArray(todos) && todos.map((todo, idx) => (
              <li
                key={idx}
                className={`card flex rounded-2xl items-center justify-between px-6 py-3 shadow-sm ${todo.completed ? 'bg-background' : ''}`}
                style={todo.completed ? {
                  position: 'relative',
                  overflow: 'hidden',
                } : {
                  background: gradientsForTodos[idx],
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Large index as a background element */}
                <span
                  className="custom-font-outline pointer-events-none select-none opacity-15 absolute left-4 top-1/2 -translate-y-1/2 text-[5rem] font-black z-0"
                  style={{
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>
                <label className="flex items-center gap-3 w-full cursor-pointer relative z-10">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(idx)}
                    className="w-5 h-5 accent-foreground rounded"
                    aria-label={todo.text}
                  />
                  <span
                    className={`text-base font-semibold font-main ${
                      todo.completed
                        ? "line-through text-muted"
                        : "text-foreground"
                    }`}
                  >
                    {todo.text}
                  </span>
                </label>
                <button
                  onClick={() => removeTodo(idx)}
                  className="ml-4 text-2xl font-bold px-2 btn relative z-10"
                  aria-label={`Remove ${todo.text}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-row items-end justify-end text-foreground text-base font-tag text-right relative min-h-[60px] gap-3 -mb-[0.9em]">
            <span>your remaining todos :</span>
            <span className="custom-font-outline text-7xl pointer-events-none leading-none -mb-[0.39em] -mr-3">
              {remaining}
            </span>
          </div>
        </main>
      </div>
    </ShadowIn>
  );
}