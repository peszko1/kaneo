import { FocusView } from "./focus-view";
import { useAlarmSound } from "./use-alarm-sound";
import { useFocusTabSync } from "./use-focus-tab-sync";

export function FocusRoot() {
  useFocusTabSync();
  useAlarmSound();
  return <FocusView />;
}
