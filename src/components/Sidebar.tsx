import { useState, useEffect } from "react";
import PomodoroTimer from "./PomodoroTimer";
import TodoBarChart from "./TodoBarChart";
import CookieViewer from "./CookieViewer";

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* Mobile menu - hidden on large screens where the grid is active */}
      <button
        className="lg:hidden fixed top-6 left-4 z-50 p-2 rounded bg-background border border-border shadow"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
          <rect y="4" width="24" height="2" rx="1" fill="currentColor" />
          <rect y="11" width="24" height="2" rx="1" fill="currentColor" />
          <rect y="18" width="24" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      {/* Mobile overlay and drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed inset-0 z-50 bg-background shadow-lg transform transition-transform duration-300 lg:hidden overflow-y-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="absolute top-4 right-4 p-2 rounded bg-background border border-border"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex flex-col h-fit gap-8 p-8 pt-16">
          <PomodoroTimer />
          <TodoBarChart />
          <CookieViewer />
        </div>
      </div>

      {/* Desktop Sidebar: Stable and positioned by the parent grid */}
      <div className="hidden lg:block w-80">
        <div className="sticky top-8 flex flex-col gap-8">
          <PomodoroTimer />
          <TodoBarChart />
          <CookieViewer />
        </div>
      </div>
    </>
  );
}