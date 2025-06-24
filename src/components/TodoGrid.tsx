"use client";

import { useEffect, useRef } from "react";
import Masonry from "masonry-layout";
import { TodoList } from "./TodoList"; // Make sure the path is correct

// Define a type for the todo items for better type safety
type TodoItem = {
  title: string;
  cookieKey: string;
  accentColor: string;
};

// This new component encapsulates all client-side logic
export default function TodoGrid({ allTodos }: { allTodos: TodoItem[] }) {
  const gridRef = useRef(null);
  const masonryInstance = useRef<Masonry | null>(null);

  // This useEffect contains the browser-only code (Masonry, window)
  // and is now safely inside a component that will not be pre-rendered on the server.
  useEffect(() => {
    // We need to check for 'window' existence for Masonry to work
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

      // These event listeners are now safe
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

  return (
    <div ref={gridRef} className="relative">
      {allTodos.map((todo) => (
        <div
          key={todo.cookieKey}
          className="grid-item w-full lg:w-[calc((100%-32px)/2)] mb-8"
        >
          <TodoList
            title={todo.title}
            cookieKey={todo.cookieKey}
            accentColor={todo.accentColor}
          />
        </div>
      ))}
    </div>
  );
}