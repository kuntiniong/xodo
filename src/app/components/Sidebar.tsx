import { useState, useEffect } from "react";
import PomodoroTimer from "./PomodoroTimer";
import TodoBarChart from "./TodoBarChart";
import LocalStorageViewer from "./LocalStorageViewer";

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
        className="card rounded-lg lg:hidden fixed top-4 right-4 z-50 p-2"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
          <defs>
            <linearGradient
              id="menu-gradient"
              x1="0"
              y1="0"
              x2="24"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="var(--color-link-from)" />
              <stop offset="1" stopColor="var(--color-link-to)" />
            </linearGradient>
          </defs>
          <rect y="4" width="24" height="2" rx="1" fill="url(#menu-gradient)" />
          <rect y="11" width="24" height="2" rx="1" fill="url(#menu-gradient)" />
          <rect y="18" width="24" height="2" rx="1" fill="url(#menu-gradient)" />
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
          className="card absolute top-4 right-4 p-2 rounded-lg"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <defs>
              <linearGradient
                id="close-gradient"
                x1="0"
                y1="0"
                x2="24"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="var(--color-link-from)" />
                <stop offset="1" stopColor="var(--color-link-to)" />
              </linearGradient>
            </defs>
            <path
              d="M6 6l12 12M6 18L18 6"
              stroke="url(#close-gradient)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {/* The container now uses a responsive grid:
            - `grid-cols-1` for mobile,
            - `sm:grid-cols-2` on small screens and up.
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-8 pt-16">
          <PomodoroTimer />
          <TodoBarChart />
          <LocalStorageViewer />
        </div>
      </div>

      {/* Desktop Sidebar: Stable and positioned by the parent grid */}
      <div className="hidden lg:block w-80">
        <div className="sticky top-8 flex flex-col gap-8">
          <PomodoroTimer />
          <TodoBarChart />
          <LocalStorageViewer />
        </div>
      </div>
    </>
  );
}