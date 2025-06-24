import React, { useState, useRef } from "react";
import ShadowIn from "./animations/ShadowIn";
import DecryptedText from "./animations/DecryptedText";

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
          <div className="flex gap-2 mb-4">
            <button
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                mode === "pomodoro"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => resetTimer("pomodoro")}
            >
              Pomodoro
            </button>
            <button
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                mode === "short"
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => resetTimer("short")}
            >
              Short Break
            </button>
            <button
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                mode === "long"
                  ? "bg-purple-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => resetTimer("long")}
            >
              Long Break
            </button>
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
          <div className="flex gap-4">
            {isRunning ? (
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold btn"
                onClick={stopTimer}
              >
                Pause
              </button>
            ) : (
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold btn"
                onClick={startTimer}
              >
                Start
              </button>
            )}
            <button
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-bold btn"
              onClick={() => resetTimer()}
            >
              Reset
            </button>
          </div>
        </main>
      </div>
    </ShadowIn>
  );
};

export default PomodoroTimer;
