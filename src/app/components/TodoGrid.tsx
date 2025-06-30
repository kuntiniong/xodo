"use client";

import { useEffect, useRef } from "react";
import Masonry from "masonry-layout";
import { TodoList } from "./TodoList"; // Make sure the path is correct

// Define a type for the todo items for better type safety
type TodoItem = {
  title: string;
  storageKey: string;
  accentColor: string;
};

// This new component encapsulates all client-side logic
export default function TodoGrid({ allTodos }: { allTodos: TodoItem[] }) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const masonryInstance = useRef<Masonry | null>(null);

  // This useEffect contains the browser-only code (Masonry, window)
  // and is now safely inside a component that will not be pre-rendered on the server.
  useEffect(() => {
    if (typeof window !== "undefined" && gridRef.current) {
      masonryInstance.current = new Masonry(gridRef.current, {
        itemSelector: ".grid-item",
        gutter: 32,
        percentPosition: true,
      });

      const handleLayoutUpdate = () => {
        // Use a small timeout to ensure DOM has updated before Masonry recalculates
        setTimeout(() => masonryInstance.current?.layout(), 100);
      };

      let resizeTimeout: NodeJS.Timeout;
      const debouncedResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleLayoutUpdate, 150);
      };

      window.addEventListener("todos-updated", handleLayoutUpdate);
      window.addEventListener("resize", debouncedResize);

      // Cleanup function
      return () => {
        masonryInstance.current?.destroy();
        window.removeEventListener("todos-updated", handleLayoutUpdate);
        window.removeEventListener("resize", debouncedResize);
      };
    }
  }, []);

  // Listen for command events and forward to TodoLists
  useEffect(() => {
    const handler = (e: any) => {
      // Forward command to all TodoLists via custom event
      window.dispatchEvent(
        new CustomEvent("todo-command-internal", { detail: e.detail })
      );
    };
    window.addEventListener("todo-command", handler);
    return () => window.removeEventListener("todo-command", handler);
  }, []);

  return (
    <div ref={gridRef} className="relative">
      {allTodos.map((todo) => (
        <div
          key={todo.storageKey}
          // This specific sequence of classes creates the 1 -> 2 -> 1 -> 2 column layout
          className="grid-item w-full sm:w-[calc((100%-32px)/2)] lg:w-full xl:w-[calc((100%-32px)/2)] mb-8"
        >
          <TodoList
            title={todo.title}
            storageKey={todo.storageKey}
            accentColor={todo.accentColor}
          />
        </div>
      ))}
    </div>
  );
}