"use client";

import React, { useEffect, useState } from "react";
import ShadowIn from "./animations/ShadowIn";
import DecryptedText from "./animations/DecryptedText";

// (Keep your Todo, get/set cookie, and gradient functions as they are)
export interface Todo {
  text: string;
  completed: boolean;
}

function getTodosFromCookie(key: string): Todo[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie.match(new RegExp(`${key}=([^;]*)`));
  if (!match) return [];
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return [];
  }
}

function setTodosToCookie(key: string, todos: Todo[]) {
  if (typeof document === "undefined") return;
  document.cookie = `${key}=${encodeURIComponent(
    JSON.stringify(todos)
  )}; path=/; max-age=31536000`;
}

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


export function TodoList({ title, cookieKey, className, accentColor = '#000000' }: { title: string; cookieKey: string; className?: string; accentColor?: string }) {
  // ==================================================================
  // FIX: All hooks are now declared at the top level, unconditionally.
  // ==================================================================
  const [mounted, setMounted] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [gradientsForTodos, setGradientsForTodos] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // We can still gate the logic inside the hook
    if (mounted) {
      setTodos(getTodosFromCookie(cookieKey));
      setHasLoaded(true);
    }
  }, [cookieKey, mounted]);

  useEffect(() => {
    if (hasLoaded && mounted) {
      setTodosToCookie(cookieKey, todos);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("todos-updated"));
      }
    }
  }, [todos, cookieKey, hasLoaded, mounted]);

  useEffect(() => {
    if (mounted) {
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

  // The conditional return now only prevents rendering, it does not change the order of hooks.
  if (!mounted) {
    return null;
  }
  
  // The rest of your component logic and JSX remains the same.
  const addTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    setTodos([...todos, { text: input.trim(), completed: false }]);
    setInput("");
  };

  const removeTodo = (idx: number) => {
    setTodos(todos.filter((_, i) => i !== idx));
  };

  const toggleTodo = (idx: number) => {
    setTodos(
      todos.map((todo, i) =>
        i === idx ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const remaining = todos.filter((t) => !t.completed).length;

  return (
    <ShadowIn className="w-full" shadowColor="white">
      {/* ... your JSX remains unchanged ... */}
      <div className={`card flex flex-col items-center justify-center bg-background text-foreground p-8 max-w-2xl w-full mx-auto relative overflow-hidden ${className ?? ''}`}>
        {/* Accent color tape in the top right corner */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 200,
            height: 80,
            background: accentColor, // use prop
            borderTopRightRadius: 24, // match card radius
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
            {todos.length === 0 && (
              <li className="text-background-muted text-center custom-font-nothing text-lg">
                no todos yet.
              </li>
            )}
            {todos.map((todo, idx) => (
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
                {!todo.completed && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 1,
                      pointerEvents: 'none',
                      backgroundImage: 'url(/grainy.jpg)',
                      opacity: 0.18,
                      mixBlendMode: 'overlay',
                    }}
                  />
                )}
                <label className="flex items-center gap-3 w-full cursor-pointer" style={{ zIndex: 2 }}>
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
                  className="ml-4 text-2xl font-bold px-2 btn"
                  aria-label={`Remove ${todo.text}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {/* Make the label and number side by side */}
          <div className="mt-2 flex flex-row items-end justify-end text-foreground text-base font-tag text-right relative min-h-[60px] gap-3 -mb-[0.9em]">
            <span>your remaining todos :</span>
            <span className="custom-font-outline text-7xl pointer-events-none leading-none -mb-[0.39em] -mr-3">
              {remaining}
            </span>
          </div>
        </main>
        {/* Remove the absolutely positioned number at the bottom right */}
      </div>
    </ShadowIn>
  );
}