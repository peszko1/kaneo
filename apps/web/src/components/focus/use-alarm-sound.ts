import { useEffect } from "react";
import { useFocusStore } from "@/store/focus";
import { useFocusSettingsStore } from "@/store/focus-settings";
import { startAlarmSound, unlockAlarmSound } from "./alarm-sound";
import { phaseEndsAt } from "./focus-timer";

// Queues the alarm for the moment the running phase ends, so it rings on
// time even in a background tab, and keeps it ringing until it is stopped.
export function useAlarmSound() {
  const sound = useFocusSettingsStore((state) => state.settings.sound);
  const hasSession = useFocusStore((state) => state.session !== null);
  const alarmAt = useFocusStore((state) => state.alarmAt);
  const upcoming = useFocusStore((state) =>
    state.session ? phaseEndsAt(state.session) : null,
  );
  const ringFrom = sound ? (alarmAt ?? upcoming) : null;

  useEffect(() => {
    if (ringFrom === null) return;
    return startAlarmSound(ringFrom);
  }, [ringFrom]);

  // After a reload the browser blocks audio until a click or key press, so
  // any one of them unlocks it before the alarm is due.
  useEffect(() => {
    if (!hasSession) return;
    // Browsers differ on which events count as a gesture, so listen to all.
    const events = ["pointerdown", "click", "touchend", "keydown"];
    for (const event of events) {
      document.addEventListener(event, unlockAlarmSound);
    }
    return () => {
      for (const event of events) {
        document.removeEventListener(event, unlockAlarmSound);
      }
    };
  }, [hasSession]);
}
