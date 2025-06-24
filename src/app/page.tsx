"use client";

import { useEffect, useRef } from "react";
import { TodoList } from "../components/TodoList";
import Sidebar from "../components/Sidebar";
import Masonry from "masonry-layout";

export default function Home() {
  const gridRef = useRef(null);
  const masonryInstance = useRef<Masonry | null>(null);

  const allTodos = [
    { title: "main", cookieKey: "todos1", accentColor: "var(--color-green-dark)" },
    { title: "admin", cookieKey: "todos2", accentColor: "var(--color-red-dark)" },
    { title: "study", cookieKey: "todos3", accentColor: "var(--color-yellow-dark)" },
    { title: "work", cookieKey: "todos4", accentColor: "var(--color-blue-dark)" },
    { title: "project", cookieKey: "todos5", accentColor: "var(--color-purple-dark)" },
    { title: "hobby", cookieKey: "todos6", accentColor: "var(--color-orange-dark)" },
  ];

  // This useEffect handles initialization, updates, and resizing.
  // No changes are needed here.
  useEffect(() => {
    if (gridRef.current) {
      masonryInstance.current = new Masonry(gridRef.current, {
        itemSelector: ".grid-item",
        gutter: 32,
        percentPosition: true,
      });

      const handleLayoutUpdate = () => {
        setTimeout(() => masonryInstance.current?.layout(), 100);
      };

      let resizeTimeout: NodeJS.Timeout;
      const debouncedResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleLayoutUpdate, 150);
      };

      window.addEventListener("todos-updated", handleLayoutUpdate);
      window.addEventListener("resize", debouncedResize);

      return () => {
        masonryInstance.current?.destroy();
        window.removeEventListener("todos-updated", handleLayoutUpdate);
        window.removeEventListener("resize", debouncedResize);
      };
    }
  }, []);

  return (
    // This part is already correct: it creates the sidebar column only at the `lg` breakpoint.
    <div className="grid lg:grid-cols-[1fr_auto] w-full max-w-screen-2xl mx-auto mt-16 gap-8 px-4 lg:px-8">
      <div ref={gridRef} className="relative">
        {allTodos.map((todo) => (
          // EXPLANATION OF THE FIX:
          // The only change is here: 'md:' is now 'lg:'.
          // This synchronizes the Masonry column change with the sidebar's appearance.
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
      <Sidebar />
    </div>
  );
}