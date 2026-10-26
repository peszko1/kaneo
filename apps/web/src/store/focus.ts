import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  advance,
  applySettings,
  extendBreak,
  type FocusMode,
  type FocusSession,
  type FocusTask,
  phaseEndsAt,
  migrateLegacySession,
  pause,
  resume,
  settle,
  startSession,
} from "@/components/focus/focus-timer";
import { showPhaseEndedNotification } from "@/components/focus/focus-notification";
import { queueFocusChange } from "@/components/focus/focus-outbox";
import type { ServerFocusSession } from "@/fetchers/focus/get-focus-session";
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
  // Shows the timer another device saved, or none when it was stopped there.
  showServerSession: (server: ServerFocusSession | null) => void;
};

const settings = () => useFocusSettingsStore.getState().settings;

type SharedState = Pick<FocusStore, "session" | "alarmAt">;

// Every change goes to the server, which records the focus time it ends.
function share({ session, alarmAt }: SharedState, at: number) {
  queueFocusChange({ at, next: session ? { ...session, alarmAt } : null });
}

export const useFocusStore = create<FocusStore>()(
  persist(
    (set, get) => {
      const commit = (
        state: SharedState & Partial<FocusStore>,
        at = Date.now(),
      ) => {
        set(state);
        share(state, at);
      };
      const update = (
        change: (session: FocusSession, now: number) => FocusSession,
      ) => {
        const { session } = get();
        if (!session) return;
        const now = Date.now();
        commit(
          { session: change(session, now), alarm: false, alarmAt: null },
          now,
        );
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
            commit(
              {
                session: startSession(task, settings(), now),
                alarmAt: null,
                alarm: false,
                viewOpen: true,
              },
              now,
            );
            return;
          }
          if (session.taskId === task.taskId) {
            set({ viewOpen: true });
            return;
          }
          // Restarting the clock closes the old task's time on the server.
          const moved = { ...session, ...task };
          commit(
            {
              session:
                session.runningSince === null
                  ? moved
                  : resume(pause(moved, now), now),
              alarmAt: get().alarmAt,
              viewOpen: true,
            },
            now,
          );
        },
        switchMode: (mode) => {
          useFocusSettingsStore.getState().changeSettings({ mode });
          const { session } = get();
          if (!session || session.mode === mode) return;
          const now = Date.now();
          commit(
            {
              session: {
                ...startSession(session, settings(), now),
                runningSince: null,
              },
              alarm: false,
              alarmAt: null,
            },
            now,
          );
        },
        openView: () => set({ viewOpen: true }),
        closeView: () => set({ viewOpen: false }),
        pause: () => update(pause),
        resume: () => update(resume),
        skip: () => update((session, now) => advance(session, settings(), now)),
        extendBreak: () => update(extendBreak),
        stop: () => {
          if (!get().session) return;
          commit({
            session: null,
            alarm: false,
            alarmAt: null,
            viewOpen: false,
          });
        },
        stopAlarm: () => {
          if (get().alarmAt === null) {
            set({ alarm: false });
            return;
          }
          commit({ session: get().session, alarm: false, alarmAt: null });
        },
        settle: () => {
          const { session } = get();
          if (!session) return;
          const now = Date.now();
          const settled = settle(session, settings(), now);
          if (settled !== session) {
            const current = settings();
            if (current.desktopNotifications)
              showPhaseEndedNotification(session);
            commit(
              {
                // Auto-start counts from now, not the phase end, so time away
                // from the computer is never recorded as focus.
                session: current.autoStartNext ? resume(settled, now) : settled,
                // Shared with every device; each rings only with sound on.
                alarm: current.sound,
                alarmAt: phaseEndsAt(session) ?? now,
                viewOpen: true,
              },
              now,
            );
          }
        },
        showServerSession: (server) => {
          if (!server) {
            set({
              session: null,
              alarm: false,
              alarmAt: null,
              viewOpen: false,
            });
            return;
          }
          const { version: _, alarmAt, ...timer } = server;
          const ringing = alarmAt !== null && get().alarmAt === null;
          set({
            session: timer,
            alarmAt,
            alarm: alarmAt !== null && settings().sound,
            viewOpen: get().viewOpen || ringing,
          });
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
  if (applied === session) return;
  useFocusStore.setState({ session: applied });
  share(useFocusStore.getState(), Date.now());
});
