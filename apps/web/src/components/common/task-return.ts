import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

const TASK_PAGE = /\/task\/[^/]+/;

// The history entry of the last page that was not a task, such as a board,
// so going back skips tasks opened one after another.
let returnIndex: number | null = null;

function historyIndex(state: unknown) {
  const index = (state as { __TSR_index?: unknown } | null)?.__TSR_index;
  return typeof index === "number" ? index : null;
}

export function isTaskPage(pathname: string) {
  return TASK_PAGE.test(pathname);
}

export function useRememberTaskReturn() {
  const router = useRouter();

  useEffect(() => {
    const remember = () => {
      const { pathname, state } = router.history.location;
      if (!isTaskPage(pathname)) returnIndex = historyIndex(state);
    };
    remember();
    return router.history.subscribe(remember);
  }, [router]);
}

// How many entries to go back to reach that page, or null to navigate.
export function stepsToReturn(state: unknown) {
  const current = historyIndex(state);
  if (returnIndex === null || current === null || returnIndex >= current)
    return null;
  return returnIndex - current;
}
