import React, { useEffect, useState } from "react";
import ShadowIn from "@/components/animations/ShadowIn";

interface Todo {
  text: string;
  completed: boolean;
}

/**
 * Get the list of todos using localStorage instead of cookies.
 * @param key The key used to store the todos.
 * @returns An array of Todo items.
 */
function getTodosFromLocalStorage(key: string): Todo[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  const saved = localStorage.getItem(key);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("Failed to parse todos from localStorage:", error);
    return [];
  }
}

// List of todo keys to check along with their labels.
const TODO_KEYS = [
  { key: "todos1", label: "main" },
  { key: "todos2", label: "admin" },
  { key: "todos3", label: "study" },
  { key: "todos4", label: "work" },
  { key: "todos5", label: "project" },
  { key: "todos6", label: "hobby" },
];

const BAR_COLORS = [
  "var(--color-green-dark)", // main
  "var(--color-red-dark)", // admin
  "var(--color-yellow-dark)", // study
  "var(--color-blue-dark)", // work
  "var(--color-purple-dark)", // project
  "var(--color-orange-dark)", // hobby
];

export default function TodoBarChart() {
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    const updateCounts = () => {
      setCounts(
        TODO_KEYS.map(({ key }) => {
          const todos = getTodosFromLocalStorage(key);
          if (Array.isArray(todos)) {
            // Count only unchecked todos.
            return todos.filter((todo) => !todo.completed).length;
          }
          return 0;
        })
      );
    };

    // Update counts at mount.
    updateCounts();

    // Handler that updates counts on custom "todos-updated" events.
    const handleTodosUpdate = () => {
      updateCounts();
    };

    // Listen for custom events that signal an update.
    window.addEventListener("todos-updated", handleTodosUpdate);

    // Fallback polling in case the event is missed.
    const interval = setInterval(updateCounts, 200);

    return () => {
      window.removeEventListener("todos-updated", handleTodosUpdate);
      clearInterval(interval);
    };
  }, []);

  // Find the maximum value (at least 1) for scaling the bars.
  const max = Math.max(...counts, 1);

  return (
    <ShadowIn className="w-full" shadowColor="white">
      <div className="card flex flex-col items-center justify-center bg-background text-foreground p-8 max-w-2xl w-full mx-auto">
        <main className="flex flex-col gap-6 w-full max-w-md">
          <h2 className="title text-5xl text-left my-2">visualization</h2>
          <div className="flex flex-col gap-3 w-full">
            {TODO_KEYS.map(({ label }, i) => (
              <div key={label} className="flex items-center gap-2 w-full">
                <span className="w-32 text-sm title pr-1 text-right">{label}</span>
                <div className="flex-1 h-4 bg-background-muted rounded relative overflow-hidden min-w-[180px]">
                  <div
                    className="h-full rounded transition-all duration-700 ease-in-out"
                    style={{
                      width: `${(counts[i] / max) * 100}%`,
                      minWidth: counts[i] > 0 ? 24 : 0,
                      background: BAR_COLORS[i] || "var(--color-muted)",
                    }}
                  ></div>
                </div>
                <span className="w-8 text-xs text-right custom-font-nothing">
                  {counts[i]}
                </span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </ShadowIn>
  );
}