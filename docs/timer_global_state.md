# Timer Architecture: Preventing Animation Re-renders with Zustand

## Problem Statement

The original Pomodoro timer component was experiencing unwanted re-renders every second when the timer was running. This caused issues with:

- **Animation Disruption**: Framer Motion animations (ShadowIn, DecryptedText) would restart or stutter
- **Performance Issues**: Entire component tree re-rendering unnecessarily
- **State Loss**: Timer would reset when toggling between chart and timer views
- **User Experience**: Animations would break when timer was active

## Solution Architecture

### Three-Store Approach

Instead of using a single Zustand store, we implemented a **separation of concerns** using three distinct stores:

#### 1. **Main Timer Store** (`useTimerStore`)
```typescript
interface TimerState {
  secondsLeft: number;
  isRunning: boolean;
  mode: TimerMode;
  intervalId: NodeJS.Timeout | null;
  // Actions: startTimer, stopTimer, resetTimer, setMode, tick
}
```
- **Purpose**: Handles core timer logic and interval management
- **Subscribers**: Only used for action functions, not state subscription
- **Updates**: Every second via `tick()` function

#### 2. **Display Store** (`useTimerDisplayStore`)
```typescript
interface TimerDisplayState {
  displaySeconds: number;
  displayMode: TimerMode;
}
```
- **Purpose**: Dedicated store for timer display values
- **Subscribers**: Only the `TimerDisplay` component
- **Updates**: Synchronized with main timer via manual `setState` calls

#### 3. **Control Store** (`useTimerControlStore`)
```typescript
interface TimerControlState {
  isRunning: boolean;
  mode: TimerMode;
}
```
- **Purpose**: UI control state that changes infrequently
- **Subscribers**: Main `PomodoroTimer` component and `Sidebar`
- **Updates**: Only on user actions (start/stop/mode change)

### Component Architecture

#### Main Component (`PomodoroTimer`)
```typescript
const PomodoroTimer: React.FC = () => {
  // Only subscribes to control store - no timer updates
  const { isRunning, mode } = useTimerControlStore();
  
  // Gets actions from main store (functions don't cause re-renders)
  const startTimer = useTimerStore((state) => state.startTimer);
  const stopTimer = useTimerStore((state) => state.stopTimer);
  // ...
}
```

#### Isolated Display Component (`TimerDisplay`)
```typescript
const TimerDisplay: React.FC = () => {
  // Only subscribes to display store
  const { displaySeconds } = useTimerDisplayStore();
  
  return (
    <div className="relative flex flex-col items-center mb-4">
      <span className="text-7xl custom-font-nothing z-10">
        {formatTime(displaySeconds)}
      </span>
      {/* Animations and styling remain stable */}
    </div>
  );
};
```

#### Side-Effect Component (`DocumentTitleUpdater`)
```typescript
const DocumentTitleUpdater: React.FC = () => {
  const { displaySeconds } = useTimerDisplayStore();
  const { isRunning, mode } = useTimerControlStore();
  
  useEffect(() => {
    // Updates document title without affecting main component
  }, [isRunning, displaySeconds, mode]);
  
  return null; // Renders nothing
};
```

## Key Benefits

### 1. **Animation Preservation**
- Main component with animations only re-renders on user actions
- Timer display updates independently without affecting parent
- Framer Motion animations remain stable and smooth

### 2. **Performance Optimization**
- Eliminated unnecessary re-renders of heavy animation components
- Timer updates only affect minimal UI elements
- Reduced CPU usage during timer operation

### 3. **State Persistence**
- Timer continues running when switching between chart/timer views
- Global state maintained across component mount/unmount cycles
- localStorage integration for user preferences

### 4. **Clean Separation of Concerns**
- Display logic separated from control logic
- Side effects isolated in dedicated components
- Easy to maintain and extend

## Implementation Details

### Store Synchronization
```typescript
tick: () => {
  const state = get();
  if (state.secondsLeft <= 1) {
    // Update all relevant stores when timer ends
    set({ secondsLeft: 0, isRunning: false, intervalId: null });
    useTimerDisplayStore.setState({ displaySeconds: 0 });
    useTimerControlStore.setState({ isRunning: false });
  } else {
    const newSeconds = state.secondsLeft - 1;
    set({ secondsLeft: newSeconds });
    // Only update display store for regular ticks
    useTimerDisplayStore.setState({ displaySeconds: newSeconds });
  }
}
```

### Memory Management
```typescript
// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const state = useTimerStore.getState();
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
  });
}
```

## Usage Pattern

### Do ✅
- Subscribe to specific stores based on component needs
- Use control store for infrequent UI state
- Use display store for frequently updating values
- Extract actions as individual subscriptions

### Don't ❌
- Subscribe to main timer store for UI components
- Mix timer state with control state in same subscription
- Update UI directly from timer tick function

## Result

- **Zero animation interruptions** during timer operation
- **Smooth 60fps animations** maintained throughout timer lifecycle
- **Global timer state** persists across view changes
- **Minimal re-renders** with optimized performance
- **Clean architecture** that's easy to understand and maintain

This approach demonstrates how proper state management architecture can solve complex UI performance issues while maintaining clean, maintainable code.
