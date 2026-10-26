import { useEffect } from "react";
import { syncFocusSession } from "./focus-sync";

// The user WebSocket also syncs on every change from another device; this
// catches up after a missed message, a sleeping laptop, or time offline.
export function useFocusServerSync() {
  useEffect(() => {
    const sync = () => void syncFocusSession();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    sync();
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
