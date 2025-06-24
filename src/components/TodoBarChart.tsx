import React, { useEffect, useState } from "react";
import ShadowIn from "./animations/ShadowIn";

// Helper to get all cookies as an object
function getAllCookies(): Record<string, string> {
  if (typeof document === "undefined") return {};
  return document.cookie.split("; ").reduce((acc, cookie) => {
    const [key, ...v] = cookie.split("=");
    acc[key] = decodeURIComponent(v.join("="));
    return acc;
  }, {} as Record<string, string>);
}

// List of todo keys to check
const TODO_KEYS = [
  { key: "todos1", label: "main" },
  { key: "todos2", label: "admin" },
  { key: "todos3", label: "study" },
  { key: "todos4", label: "work" },
  { key: "todos5", label: "project" },
  { key: "todos6", label: "hobby" },
];

const BAR_COLORS = [
  'var(--color-green-dark)',   // main
  'var(--color-red-dark)',    // admin
  'var(--color-yellow-dark)', // study
  'var(--color-blue-dark)',   // work
  'var(--color-purple-dark)', // project
  'var(--color-orange-dark)', // hobby
];

export default function TodoBarChart() {
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const titles = ["main", "admin", "study", "work", "project", "hobby"];

  useEffect(() => {
    const updateCounts = () => {
      const cookies = getAllCookies();
      setCounts(
        TODO_KEYS.map(({ key }) => {
          try {
            const raw = cookies[key] || "";
            if (!raw) return 0;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              // Count only unchecked todos
              return parsed.filter((todo: any) => !todo.completed).length;
            }
            if (typeof parsed === "object" && parsed !== null) {
              // If object, count only unchecked
              return Object.values(parsed).filter((todo: any) => !todo.completed).length;
            }
            return 0;
          } catch {
            return 0;
          }
        })
      );
    };
    updateCounts();
    // Listen for custom event to update immediately
    window.addEventListener("todos-updated", updateCounts);
    // Fallback polling in case event is missed
    const interval = setInterval(updateCounts, 200);
    return () => {
      window.removeEventListener("todos-updated", updateCounts);
      clearInterval(interval);
    };
  }, []);

  // Find the max for scaling 
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
                      background: BAR_COLORS[i] || 'var(--color-muted)',
                    }}
                  ></div>
                </div>
                <span className="w-8 text-xs text-right custom-font-nothing">{counts[i]}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </ShadowIn>
  );
}
