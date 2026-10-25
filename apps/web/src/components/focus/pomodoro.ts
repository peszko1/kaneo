export type PomodoroPhase = "focus" | "shortBreak" | "longBreak";

export const PHASE_DURATION_MS: Record<PomodoroPhase, number> = {
  focus: 25 * 60_000,
  shortBreak: 5 * 60_000,
  longBreak: 15 * 60_000,
};

export const FOCUS_ROUNDS_PER_LONG_BREAK = 4;

export type FocusTask = {
  taskId: string;
  projectId: string;
  workspaceId: string;
};

// The end time is stored instead of a ticking counter, so the timer stays
// right across reloads, tabs, and throttled background timers.
export type PomodoroSession = FocusTask & {
  phase: PomodoroPhase;
  completedFocusRounds: number;
  endsAt: number | null;
  pausedRemainingMs: number;
};

export function startSession(task: FocusTask, now: number): PomodoroSession {
  return {
    ...task,
    phase: "focus",
    completedFocusRounds: 0,
    endsAt: now + PHASE_DURATION_MS.focus,
    pausedRemainingMs: PHASE_DURATION_MS.focus,
  };
}

export function isRunning(session: PomodoroSession) {
  return session.endsAt !== null;
}

export function remainingMs(session: PomodoroSession, now: number) {
  if (session.endsAt === null) return session.pausedRemainingMs;
  return Math.max(0, session.endsAt - now);
}

export function pause(session: PomodoroSession, now: number): PomodoroSession {
  if (session.endsAt === null) return session;
  return {
    ...session,
    endsAt: null,
    pausedRemainingMs: remainingMs(session, now),
  };
}

export function resume(session: PomodoroSession, now: number): PomodoroSession {
  if (session.endsAt !== null) return session;
  return { ...session, endsAt: now + session.pausedRemainingMs };
}

// The next phase waits for the user to start it, so a break never runs out
// unseen while they are away.
export function advance(session: PomodoroSession): PomodoroSession {
  if (session.phase !== "focus") {
    return {
      ...session,
      phase: "focus",
      endsAt: null,
      pausedRemainingMs: PHASE_DURATION_MS.focus,
    };
  }

  const completedFocusRounds = session.completedFocusRounds + 1;
  const phase =
    completedFocusRounds % FOCUS_ROUNDS_PER_LONG_BREAK === 0
      ? "longBreak"
      : "shortBreak";
  return {
    ...session,
    phase,
    completedFocusRounds,
    endsAt: null,
    pausedRemainingMs: PHASE_DURATION_MS[phase],
  };
}

export function settle(session: PomodoroSession, now: number) {
  if (session.endsAt !== null && session.endsAt <= now) {
    return advance(session);
  }
  return session;
}

// Shorter focus stretches, like a quick start and pause, are not recorded.
export const MIN_RECORDED_MS = 60_000;

export type FocusSegment = {
  taskId: string;
  startTime: number;
  endTime: number;
};

// The focus time since the timer last started, ending now or when the phase
// ran out, whichever came first. Breaks are never recorded.
export function focusSegment(
  session: PomodoroSession,
  now: number,
): FocusSegment | null {
  if (session.phase !== "focus" || session.endsAt === null) return null;
  const startTime = session.endsAt - session.pausedRemainingMs;
  const endTime = Math.min(now, session.endsAt);
  if (endTime - startTime < MIN_RECORDED_MS) return null;
  return { taskId: session.taskId, startTime, endTime };
}

// Position within the current set of rounds, from 1 to FOCUS_ROUNDS_PER_LONG_BREAK.
export function currentRound(session: PomodoroSession) {
  const done = session.completedFocusRounds % FOCUS_ROUNDS_PER_LONG_BREAK;
  if (session.phase === "longBreak") return FOCUS_ROUNDS_PER_LONG_BREAK;
  if (session.phase === "shortBreak") return done;
  return done + 1;
}
