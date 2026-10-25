import { FocusView } from "./focus-view";
import { useAlarmSound } from "./use-alarm-sound";
import { useFlushFocusTime } from "./use-flush-focus-time";
import { useFocusTabSync } from "./use-focus-tab-sync";
import { useFocusTabTitle } from "./use-focus-tab-title";

export function FocusRoot() {
  useFocusTabSync();
  useAlarmSound();
  useFlushFocusTime();
  useFocusTabTitle();
  return <FocusView />;
}
