import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import ShadowIn from "@/components/animations/ShadowIn";
import DecryptedText from "@/components/animations/DecryptedText";

const POMODORO_DURATION = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const PomodoroTimer: React.FC = () => {
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"pomodoro" | "short" | "long">("pomodoro");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    if (intervalRef.current) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  };

  const resetTimer = (newMode = mode) => {
    stopTimer();
    setMode(newMode);
    if (newMode === "pomodoro") setSecondsLeft(POMODORO_DURATION);
    else if (newMode === "short") setSecondsLeft(SHORT_BREAK);
    else setSecondsLeft(LONG_BREAK);
  };

  return (
    <ShadowIn className="w-full" shadowColor="white">
      <div className="card flex flex-col items-center justify-center bg-background text-foreground p-8 max-w-2xl w-full mx-auto">
        <main className="flex flex-col gap-6 w-full max-w-md">
          <h1 className="title text-5xl text-left my-2">
            <DecryptedText
              text="pomodoro"
              animateOn="view"
              className="title"
              speed={50}
              maxIterations={20}
            />
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
                onClick={() => resetTimer("pomodoro")}
              >
                pomodoro
              </button>
              <button
                className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors duration-200 ${
                  mode === "short"
                    ? "text-foreground"
                    : "text-foreground-muted"
                }`}
                onClick={() => resetTimer("short")}
              >
                short break
              </button>
              <button
                className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors duration-200 ${
                  mode === "long"
                    ? "text-foreground"
                    : "text-foreground-muted"
                }`}
                onClick={() => resetTimer("long")}
              >
                long break
              </button>
            </div>
          </div>
          <div className="relative flex flex-col items-center mb-4">
            <span className="text-7xl custom-font-nothing z-10">
              {formatTime(secondsLeft)}
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
              onClick={() => resetTimer()}
            >
              reset
            </button>
          </div>
        </main>
      </div>
    </ShadowIn>
  );
};

export default PomodoroTimer;
