import { useEffect } from "react";
import { useFocusStore } from "@/store/focus";
import { useFocusSettingsStore } from "@/store/focus-settings";
import { clockText } from "./focus-timer";
import { useFocusClock } from "./use-focus-clock";

const PREFIX = /^\+?\d+:\d{2} · /;

// Shows the running timer in front of the page title, e.g. "12:41 · Board".
export function useFocusTabTitle() {
  const session = useFocusStore((state) => state.session);
  const settings = useFocusSettingsStore((state) => state.settings);
  const shown = useFocusClock();
  const text =
    session?.runningSince != null ? clockText(session, shown, settings) : null;

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
