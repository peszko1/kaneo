import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  advance,
  type FocusTask,
  type PomodoroSession,
  pause,
  resume,
  settle,
  startSession,
} from "@/components/focus/pomodoro";

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

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => {
      const update = (
        change: (session: PomodoroSession) => PomodoroSession,
      ) => {
        const { session } = get();
        if (session) set({ session: change(session), alarm: false });
      };

      return {
        session: null,
        alarm: false,
        viewOpen: false,
        focusOn: (task) =>
          set(({ session }) => ({
            session: session
              ? { ...session, ...task }
              : startSession(task, Date.now()),
            viewOpen: true,
          })),
        openView: () => set({ viewOpen: true }),
        closeView: () => set({ viewOpen: false }),
        pause: () => update((session) => pause(session, Date.now())),
        resume: () => update((session) => resume(session, Date.now())),
        skip: () => update(advance),
        stop: () => set({ session: null, alarm: false, viewOpen: false }),
        stopAlarm: () => set({ alarm: false }),
        settle: () => {
          const { session } = get();
          if (!session) return;
          const settled = settle(session, Date.now());
          if (settled !== session) {
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
