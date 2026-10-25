import { useEffect } from "react";
import { flushPendingFocusTime } from "./record-focus-time";

// Sends focus time that could not be saved earlier, e.g. while offline.
export function useFlushFocusTime() {
  useEffect(() => {
    flushPendingFocusTime();
    window.addEventListener("online", flushPendingFocusTime);
    return () => window.removeEventListener("online", flushPendingFocusTime);
  }, []);
}
