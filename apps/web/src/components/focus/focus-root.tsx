import { FocusView } from "./focus-view";
import { useAlarmSound } from "./use-alarm-sound";
import { useFlushFocusTime } from "./use-flush-focus-time";
import { useFocusTabSync } from "./use-focus-tab-sync";

export function FocusRoot() {
  useFocusTabSync();
  useAlarmSound();
  useFlushFocusTime();
  return <FocusView />;
}
