import { useEffect } from "react";
import { useFocusStore } from "@/store/focus";
import { startAlarmSound } from "./alarm-sound";

export function useAlarmSound() {
  const alarm = useFocusStore((state) => state.alarm);

  useEffect(() => {
    if (!alarm) return;
    return startAlarmSound();
  }, [alarm]);
}
