import { useState, useEffect } from "react";
import PomodoroTimer from "./PomodoroTimer";
import TodoBarChart from "./TodoBarChart";
import LocalStorageViewer from "./LocalStorageViewer";
import { useTimerControlStore } from "@/stores/timerStore";
import { useSidebarStore } from "@/stores/sidebarStore";

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useSidebarStore();
  const [showVisualization, setShowVisualization] = useState(true); // true = TodoBarChart, false = PomodoroTimer
  const { isRunning } = useTimerControlStore();

  // Load toggle state from localStorage on component mount
  useEffect(() => {
    const savedToggleState = localStorage.getItem("sidebar-toggle-state");
    if (savedToggleState !== null) {
      setShowVisualization(JSON.parse(savedToggleState));
    }
  }, []);

  // Save toggle state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "sidebar-toggle-state",
      JSON.stringify(showVisualization)
    );
  }, [showVisualization]);

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

  // Toggle component that switches between TodoBarChart and PomodoroTimer
  const ToggleableComponent = () => (
    <div className="relative">
      {/* Toggle buttons */}
      <div className="flex mb-4 p-1 card rounded-full">
        <button
          onClick={() => setShowVisualization(true)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
            showVisualization
              ? "bg-foreground text-background"
              : "text-foreground-muted hover:text-link-hover"
          }`}
        >
          chart
        </button>
        <button
          onClick={() => setShowVisualization(false)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
            !showVisualization
              ? "bg-foreground text-background"
              : "text-foreground-muted hover:text-link-hover"
          }`}
        >
          timer {isRunning && <span className="ml-1 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
        </button>
      </div>

      {/* Component content */}
      <div className="transition-all duration-300">
        {showVisualization ? <TodoBarChart /> : <PomodoroTimer />}
      </div>
    </div>
  );

  return (
    <>
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
          className="absolute top-4 right-4 p-2 rounded-lg"
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
        <div className="sticky top-22 flex flex-col gap-8">
          <ToggleableComponent />
          <LocalStorageViewer />
        </div>
      </div>
    </>
  );
}
