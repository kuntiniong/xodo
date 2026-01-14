import React, { useEffect } from "react";
import { motion } from "framer-motion";
import ShadowIn from "@/components/animations/ShadowIn";
import { useTimerStore, useTimerDisplayStore, useTimerControlStore } from "@/stores/timerStore";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Separate component for document title updates to avoid re-rendering main component
const DocumentTitleUpdater: React.FC = () => {
  const { displaySeconds } = useTimerDisplayStore();
  const { isRunning, mode } = useTimerControlStore();

  useEffect(() => {
    if (isRunning && displaySeconds > 0) {
      const modeEmoji = mode === "pomodoro" ? "🍅" : mode === "short" ? "☕" : "🎯";
      document.title = `${modeEmoji} ${formatTime(displaySeconds)} - Xodo`;
    } else {
      document.title = "Xodo - A Keyboard-first To do list";
    }
  }, [isRunning, displaySeconds, mode]);

  return null; // This component doesn't render anything
};

// Separate component for just the timer display to avoid re-rendering animations
const TimerDisplay: React.FC = () => {
  const { displaySeconds } = useTimerDisplayStore();
  
  return (
    <div className="relative flex flex-col items-center mb-4">
      <span className="text-7xl custom-font-nothing z-10">
        {formatTime(displaySeconds)}
      </span>
      <span
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          backgroundImage: "url(/grainy.jpg)",
          opacity: 0.18,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
};

const PomodoroTimer: React.FC = () => {
  // Use control store to avoid re-renders from timer updates
  const { isRunning, mode } = useTimerControlStore();
  const startTimer = useTimerStore((state) => state.startTimer);
  const stopTimer = useTimerStore((state) => state.stopTimer);
  const resetTimer = useTimerStore((state) => state.resetTimer);
  const setMode = useTimerStore((state) => state.setMode);

  const handleModeChange = (newMode: "pomodoro" | "short" | "long") => {
    setMode(newMode);
  };

  return (
    <>
      <DocumentTitleUpdater />
      <ShadowIn className="w-full" shadowColor="white">
      <div className="card flex flex-col items-center justify-center bg-background text-foreground p-8 max-w-2xl w-full mx-auto">
        <main className="flex flex-col gap-6 w-full max-w-md">
          <h1 className="title text-5xl text-left my-1">
            pomodoro
          </h1>

          <div className="relative mb-4 justify-center">
            {/* Animated indicator */}
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.4 }}
              className="absolute top-0 left-0 h-full rounded-lg z-0"
              style={{
                width: "calc(100% / 3)",
                background:
                  mode === "pomodoro"
                    ? "var(--color-blue-dark)"
                    : mode === "short"
                    ? "var(--color-green-dark)"
                    : "var(--color-purple-dark)",
                transform:
                  mode === "pomodoro"
                    ? "translateX(0%)"
                    : mode === "short"
                    ? "translateX(100%)"
                    : "translateX(200%)",
                transition: "transform 0.18s cubic-bezier(.4,1.2,.6,1)",
              }}
            />
            {/* Mode buttons grid */}
            <div className="relative grid grid-cols-3 gap-2 z-10">
              <button
                className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors duration-200 ${
                  mode === "pomodoro"
                    ? "text-foreground"
                    : "text-foreground-muted"
                }`}
                onClick={() => handleModeChange("pomodoro")}
              >
                pomodoro
              </button>
              <button
                className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors duration-200 ${
                  mode === "short"
                    ? "text-foreground"
                    : "text-foreground-muted"
                }`}
                onClick={() => handleModeChange("short")}
              >
                short break
              </button>
              <button
                className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors duration-200 ${
                  mode === "long"
                    ? "text-foreground"
                    : "text-foreground-muted"
                }`}
                onClick={() => handleModeChange("long")}
              >
                long break
              </button>
            </div>
          </div>
          <TimerDisplay />
          <div className="flex gap-4 justify-center">
            {isRunning ? (
              <button
                className="card btn px-4 py-0 rounded-lg font-bold"
                onClick={stopTimer}
              >
                pause
              </button>
            ) : (
              <button
                className="card btn px-4 py-0 rounded-lg font-bold"
                onClick={startTimer}
              >
                start
              </button>
            )}
            <button
              className="px-4 py-2 text-foreground-muted rounded-lg font-bold"
              onClick={resetTimer}
            >
              reset
            </button>
          </div>
        </main>
      </div>
    </ShadowIn>
    </>
  );
};

export default PomodoroTimer;
