import { FocusView } from "./focus-view";
import { useAlarmSound } from "./use-alarm-sound";
import { useFlushFocusTime } from "./use-flush-focus-time";
import { useFocusServerSync } from "./use-focus-server-sync";
import { useFocusTabSync } from "./use-focus-tab-sync";
import { useFocusTabTitle } from "./use-focus-tab-title";

export function FocusRoot() {
  useFocusTabSync();
  useAlarmSound();
  useFlushFocusTime();
  useFocusServerSync();
  useFocusTabTitle();
  return <FocusView />;
}
