import { useState } from "react";

// The backlog column starts folded. Each board remembers it per browser.
export function useBacklogOpen(boardId: string) {
  const key = `kaneo:backlog-open:${boardId}`;
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setOpen(!open);
    try {
      localStorage.setItem(key, open ? "0" : "1");
    } catch {
      // Storage can be blocked; the column then folds again on reload.
    }
  };
  return [open, toggle] as const;
}
