"use client";

import dynamic from "next/dynamic";
import Sidebar from "./components/Sidebar";

// Dynamically import the new TodoGrid component with SSR disabled.
// This prevents it from running during the server-side build.
const ClientOnlyTodoGrid = dynamic(() => import("./components/TodoGrid"), {
  ssr: false,
  // Optional: Show a loading skeleton or message while the component loads on the client
  loading: () => (
    <div className="w-full h-96 animate-pulse bg-transparent rounded-lg"></div>
  ),
});

// This is now a Server Component. It has no "use client" and no hooks.
export default function Home() {
  // Data can be defined and passed from a Server Component
  const allTodos = [
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