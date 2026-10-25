import { useEffect, useState } from "react";
import { useFocusStore } from "@/store/focus";
import { displayMs } from "./focus-timer";

const TICK_MS = 250;

// Re-renders while the timer runs and moves to the next phase once the
// current one ends. Returns the time left, or the time spent when the phase
// counts up.
export function useFocusClock() {
  const session = useFocusStore((state) => state.session);
  const settle = useFocusStore((state) => state.settle);
  const [now, setNow] = useState(() => Date.now());
  const running = session?.runningSince != null;

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      setNow(Date.now());
      settle();
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [running, settle]);

  return session ? displayMs(session, running ? now : Date.now()) : 0;
}
