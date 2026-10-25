import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  advance,
  type FocusTask,
  focusSegment,
  type PomodoroSession,
  pause,
  resume,
  settle,
  startSession,
} from "@/components/focus/pomodoro";
import { recordFocusSegment } from "@/components/focus/record-focus-time";

export const FOCUS_STORAGE_KEY = "focus-session";

type FocusStore = {
  session: PomodoroSession | null;
  // Set when a phase runs out; the alarm rings until the user stops it.
  alarm: boolean;
  viewOpen: boolean;
  // Keeps the running timer when the session moves to another task.
  focusOn: (task: FocusTask) => void;
  openView: () => void;
  closeView: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  stop: () => void;
  stopAlarm: () => void;
  settle: () => void;
};

// Records the focus time that ends with this change, if any.
function recordUntil(session: PomodoroSession, now: number) {
  const segment = focusSegment(session, now);
  if (segment) recordFocusSegment(segment);
}

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => {
      const update = (
        change: (session: PomodoroSession, now: number) => PomodoroSession,
      ) => {
        const { session } = get();
        if (!session) return;
        const now = Date.now();
        recordUntil(session, now);
        set({ session: change(session, now), alarm: false });
      };

      return {
        session: null,
        alarm: false,
        viewOpen: false,
        focusOn: (task) => {
          const { session } = get();
          const now = Date.now();
          if (!session) {
            set({ session: startSession(task, now), viewOpen: true });
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
              session.endsAt === null ? moved : resume(pause(moved, now), now),
            viewOpen: true,
          });
        },
        openView: () => set({ viewOpen: true }),
        closeView: () => set({ viewOpen: false }),
        pause: () => update(pause),
        resume: () => update(resume),
        skip: () => update(advance),
        stop: () => {
          const { session } = get();
          if (session) recordUntil(session, Date.now());
          set({ session: null, alarm: false, viewOpen: false });
        },
        stopAlarm: () => set({ alarm: false }),
        settle: () => {
          const { session } = get();
          if (!session) return;
          const now = Date.now();
          const settled = settle(session, now);
          if (settled !== session) {
            recordUntil(session, now);
            set({ session: settled, alarm: true, viewOpen: true });
          }
        },
      };
    },
    {
      name: FOCUS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ session, alarm }) => ({ session, alarm }),
    },
  ),
);
