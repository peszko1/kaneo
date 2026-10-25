import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  advance,
  applySettings,
  extendBreak,
  type FocusMode,
  type FocusSession,
  type FocusTask,
  focusSegment,
  phaseEndsAt,
  migrateLegacySession,
  pause,
  resume,
  settle,
  startSession,
} from "@/components/focus/focus-timer";
import { showPhaseEndedNotification } from "@/components/focus/focus-notification";
import { recordFocusSegment } from "@/components/focus/record-focus-time";
import { useFocusSettingsStore } from "./focus-settings";

export const FOCUS_STORAGE_KEY = "focus-session";

type FocusStore = {
  session: FocusSession | null;
  // Set when a phase runs out; the alarm rings until the user stops it.
  alarm: boolean;
  // When the alarm started ringing, so every tab plays the same beeps.
  alarmAt: number | null;
  viewOpen: boolean;
  // Keeps the running timer when the session moves to another task.
  focusOn: (task: FocusTask) => void;
  // Restarts the session in the new mode, paused, on the same task.
  switchMode: (mode: FocusMode) => void;
  openView: () => void;
  closeView: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  extendBreak: () => void;
  stop: () => void;
  stopAlarm: () => void;
  settle: () => void;
};

const settings = () => useFocusSettingsStore.getState().settings;

// Records the focus time that ends with this change, if any.
function recordUntil(session: FocusSession, now: number) {
  const segment = focusSegment(session, now);
  if (segment) recordFocusSegment(segment);
}

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => {
      const update = (
        change: (session: FocusSession, now: number) => FocusSession,
      ) => {
        const { session } = get();
        if (!session) return;
        const now = Date.now();
        recordUntil(session, now);
        set({ session: change(session, now), alarm: false, alarmAt: null });
      };

      return {
        session: null,
        alarm: false,
        alarmAt: null,
        viewOpen: false,
        focusOn: (task) => {
          const { session } = get();
          const now = Date.now();
          if (!session) {
            set({
              session: startSession(task, settings(), now),
              viewOpen: true,
            });
            return;
          }
          if (session.taskId === task.taskId) {
            set({ viewOpen: true });
            return;
          }
          // Close the old task's time and start counting for the new one.
          recordUntil(session, now);
          const moved = { ...session, ...task };
          set({
            session:
              session.runningSince === null
                ? moved
                : resume(pause(moved, now), now),
            viewOpen: true,
          });
        },
        switchMode: (mode) => {
          useFocusSettingsStore.getState().changeSettings({ mode });
          const { session } = get();
          if (!session || session.mode === mode) return;
          const now = Date.now();
          recordUntil(session, now);
          set({
            session: {
              ...startSession(session, settings(), now),
              runningSince: null,
            },
            alarm: false,
            alarmAt: null,
          });
        },
        openView: () => set({ viewOpen: true }),
        closeView: () => set({ viewOpen: false }),
        pause: () => update(pause),
        resume: () => update(resume),
        skip: () => update((session, now) => advance(session, settings(), now)),
        extendBreak: () => update(extendBreak),
        stop: () => {
          const { session } = get();
          if (session) recordUntil(session, Date.now());
          set({
            session: null,
            alarm: false,
            alarmAt: null,
            viewOpen: false,
          });
        },
        stopAlarm: () => set({ alarm: false, alarmAt: null }),
        settle: () => {
          const { session } = get();
          if (!session) return;
          const now = Date.now();
          const settled = settle(session, settings(), now);
          if (settled !== session) {
            recordUntil(session, now);
            const current = settings();
            if (current.desktopNotifications)
              showPhaseEndedNotification(session);
            set({
              // Auto-start counts from now, not the phase end, so time away
              // from the computer is never recorded as focus.
              session: current.autoStartNext ? resume(settled, now) : settled,
              alarm: current.sound,
              alarmAt: current.sound ? (phaseEndsAt(session) ?? now) : null,
              viewOpen: true,
            });
          }
        },
      };
    },
    {
      name: FOCUS_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ session, alarm, alarmAt }) => ({
        session,
        alarm,
        alarmAt,
      }),
      migrate: (persisted, version) => {
        const state = persisted as {
          session?: unknown;
          alarm?: boolean;
          alarmAt?: number | null;
        };
        const session =
          version === 0 && state.session
            ? migrateLegacySession(
                state.session as Parameters<typeof migrateLegacySession>[0],
              )
            : state.session;
        const alarmAt =
          version < 2 ? (state.alarm ? Date.now() : null) : state.alarmAt;
        return { ...state, session, alarmAt };
      },
    },
  ),
);

useFocusSettingsStore.subscribe(({ settings }) => {
  const { session } = useFocusStore.getState();
  if (!session) return;
  const applied = applySettings(session, settings);
  if (applied !== session) useFocusStore.setState({ session: applied });
});
