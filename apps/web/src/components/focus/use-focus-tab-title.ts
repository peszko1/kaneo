import { useEffect } from "react";
import { useFocusStore } from "@/store/focus";
import { formatCountdown } from "./format-countdown";
import { useFocusClock } from "./use-focus-clock";

const PREFIX = /^\d+:\d{2} · /;

// Shows the running timer in front of the page title, e.g. "12:41 · Board".
export function useFocusTabTitle() {
  const running = useFocusStore((state) => state.session?.runningSince != null);
  const shown = useFocusClock();
  const text = running ? formatCountdown(shown) : null;

  useEffect(() => {
    const base = document.title.replace(PREFIX, "");
    document.title = text ? `${text} · ${base}` : base;
  }, [text]);

  useEffect(
    () => () => {
      document.title = document.title.replace(PREFIX, "");
    },
    [],
  );
}
