import { useEffect } from "react";
import { FOCUS_STORAGE_KEY, useFocusStore } from "@/store/focus";

// Other tabs change the timer through localStorage; reload it here so every
// tab shows the same session.
export function useFocusTabSync() {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FOCUS_STORAGE_KEY) {
        void useFocusStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
