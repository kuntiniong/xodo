import { create } from 'zustand';

const POMODORO_DURATION = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

type TimerMode = 'pomodoro' | 'short' | 'long';

interface TimerState {
  secondsLeft: number;
  isRunning: boolean;
  mode: TimerMode;
  intervalId: NodeJS.Timeout | null;
  
  // Actions
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  setMode: (mode: TimerMode) => void;
  tick: () => void;
}

// Separate store for just the timer display to avoid re-rendering the whole component
interface TimerDisplayState {
  displaySeconds: number;
  displayMode: TimerMode;
}

// Separate store for control state to minimize main component re-renders
interface TimerControlState {
  isRunning: boolean;
  mode: TimerMode;
}

export const useTimerDisplayStore = create<TimerDisplayState>(() => ({
  displaySeconds: POMODORO_DURATION,
  displayMode: 'pomodoro',
}));

export const useTimerControlStore = create<TimerControlState>(() => ({
  isRunning: false,
  mode: 'pomodoro',
}));

export const useTimerStore = create<TimerState>((set, get) => ({
  secondsLeft: POMODORO_DURATION,
  isRunning: false,
  mode: 'pomodoro',
  intervalId: null,

  startTimer: () => {
    const state = get();
    if (state.intervalId) return; // Already running
    
    const intervalId = setInterval(() => {
      get().tick();
    }, 1000);
    
    set({ isRunning: true, intervalId });
    // Update control store
    useTimerControlStore.setState({ isRunning: true });
  },

  stopTimer: () => {
    const state = get();
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    set({ isRunning: false, intervalId: null });
    // Update control store
    useTimerControlStore.setState({ isRunning: false });
  },

  resetTimer: () => {
    const state = get();
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    
    const duration = state.mode === 'pomodoro' 
      ? POMODORO_DURATION 
      : state.mode === 'short' 
        ? SHORT_BREAK 
        : LONG_BREAK;
    
    set({ 
      secondsLeft: duration, 
      isRunning: false, 
      intervalId: null 
    });
    // Update stores
    useTimerDisplayStore.setState({ displaySeconds: duration });
    useTimerControlStore.setState({ isRunning: false });
  },

  setMode: (mode: TimerMode) => {
    const state = get();
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    
    const duration = mode === 'pomodoro' 
      ? POMODORO_DURATION 
      : mode === 'short' 
        ? SHORT_BREAK 
        : LONG_BREAK;
    
    set({ 
      mode, 
      secondsLeft: duration, 
      isRunning: false, 
      intervalId: null 
    });
    // Update stores
    useTimerDisplayStore.setState({ 
      displaySeconds: duration,
      displayMode: mode 
    });
    useTimerControlStore.setState({ 
      mode,
      isRunning: false 
    });
  },

  tick: () => {
    const state = get();
    if (state.secondsLeft <= 1) {
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }
      set({ 
        secondsLeft: 0, 
        isRunning: false, 
        intervalId: null 
      });
      // Update stores
      useTimerDisplayStore.setState({ displaySeconds: 0 });
      useTimerControlStore.setState({ isRunning: false });
    } else {
      const newSeconds = state.secondsLeft - 1;
      set({ secondsLeft: newSeconds });
      // Update display store only
      useTimerDisplayStore.setState({ displaySeconds: newSeconds });
    }
  },
}));

// Cleanup function to stop timer when the app is closed/refreshed
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const state = useTimerStore.getState();
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
  });
}

export const getDurationForMode = (mode: TimerMode): number => {
  switch (mode) {
    case 'pomodoro': return POMODORO_DURATION;
    case 'short': return SHORT_BREAK;
    case 'long': return LONG_BREAK;
    default: return POMODORO_DURATION;
  }
};
