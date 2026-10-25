export type FocusMode = "pomodoro" | "flowtime" | "countdown";
export const FOCUS_MODES: FocusMode[] = ["pomodoro", "flowtime", "countdown"];

export type FocusPhase = "focus" | "shortBreak" | "longBreak";

export type FocusSettings = {
  mode: FocusMode;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  roundsPerLongBreak: number;
  countdownMinutes: number;
  sound: boolean;
  desktopNotifications: boolean;
  autoStartNext: boolean;
};

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  mode: "pomodoro",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsPerLongBreak: 4,
  countdownMinutes: 50,
  sound: true,
  desktopNotifications: false,
  autoStartNext: false,
};

// Flowtime breaks last a fifth of the focus time, but at least a minute.
const FLOWTIME_BREAK_RATIO = 5;
const MIN_FLOWTIME_BREAK_MS = 60_000;

export type FocusTask = {
  taskId: string;
  projectId: string;
  workspaceId: string;
};

// Elapsed time is stored with the moment the timer last started, not as a
// ticking counter, so the timer stays right across reloads, tabs, and
// throttled background timers.
export type FocusSession = FocusTask & {
  mode: FocusMode;
  phase: FocusPhase;
  completedFocusRounds: number;
  // null counts up (Flowtime focus); otherwise the phase length.
  durationMs: number | null;
  elapsedMs: number;
  runningSince: number | null;
};

const minutes = (value: number) => value * 60_000;

function focusDuration(settings: FocusSettings) {
  if (settings.mode === "flowtime") return null;
  return minutes(
    settings.mode === "countdown"
      ? settings.countdownMinutes
      : settings.focusMinutes,
  );
}

export function startSession(
  task: FocusTask,
  settings: FocusSettings,
  now: number,
): FocusSession {
  return {
    ...task,
    mode: settings.mode,
    phase: "focus",
    completedFocusRounds: 0,
    durationMs: focusDuration(settings),
    elapsedMs: 0,
    runningSince: now,
  };
}

export function isRunning(session: FocusSession) {
  return session.runningSince !== null;
}

export function elapsedMs(session: FocusSession, now: number) {
  if (session.runningSince === null) return session.elapsedMs;
  return session.elapsedMs + Math.max(0, now - session.runningSince);
}

// Time left in a timed phase, or time spent in a phase that counts up.
export function displayMs(session: FocusSession, now: number) {
  const elapsed = elapsedMs(session, now);
  if (session.durationMs === null) return elapsed;
  return Math.max(0, session.durationMs - elapsed);
}

export function phaseEndsAt(session: FocusSession) {
  if (session.runningSince === null || session.durationMs === null) {
    return null;
  }
  return session.runningSince + session.durationMs - session.elapsedMs;
}

export function pause(session: FocusSession, now: number): FocusSession {
  if (session.runningSince === null) return session;
  const end = phaseEndsAt(session);
  return {
    ...session,
    elapsedMs: elapsedMs(session, end === null ? now : Math.min(now, end)),
    runningSince: null,
  };
}

export function resume(session: FocusSession, now: number): FocusSession {
  if (session.runningSince !== null) return session;
  return { ...session, runningSince: now };
}

// The next phase waits for the user to start it, so a break never runs out
// unseen while they are away. Settings apply from the next phase on.
export function advance(
  session: FocusSession,
  settings: FocusSettings,
  now: number,
): FocusSession {
  const next = {
    ...session,
    mode: settings.mode,
    elapsedMs: 0,
    runningSince: null,
  };

  if (session.phase !== "focus" || settings.mode === "countdown") {
    const completedFocusRounds =
      session.phase === "focus"
        ? session.completedFocusRounds + 1
        : session.completedFocusRounds;
    return {
      ...next,
      phase: "focus",
      completedFocusRounds,
      durationMs: focusDuration(settings),
    };
  }

  const completedFocusRounds = session.completedFocusRounds + 1;
  if (settings.mode === "flowtime") {
    return {
      ...next,
      phase: "shortBreak",
      completedFocusRounds,
      durationMs: Math.max(
        MIN_FLOWTIME_BREAK_MS,
        Math.round(elapsedMs(session, now) / FLOWTIME_BREAK_RATIO),
      ),
    };
  }

  const longBreak = completedFocusRounds % settings.roundsPerLongBreak === 0;
  return {
    ...next,
    phase: longBreak ? "longBreak" : "shortBreak",
    completedFocusRounds,
    durationMs: minutes(
      longBreak ? settings.longBreakMinutes : settings.shortBreakMinutes,
    ),
  };
}

export function isDue(session: FocusSession, now: number) {
  const end = phaseEndsAt(session);
  return end !== null && end <= now;
}

export function settle(
  session: FocusSession,
  settings: FocusSettings,
  now: number,
) {
  const end = phaseEndsAt(session);
  if (end === null || end > now) return session;
  return advance(session, settings, end);
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
  session: FocusSession,
  now: number,
): FocusSegment | null {
  if (session.phase !== "focus" || session.runningSince === null) return null;
  const end = phaseEndsAt(session);
  const startTime = session.runningSince;
  const endTime = end === null ? now : Math.min(now, end);
  if (endTime - startTime < MIN_RECORDED_MS) return null;
  return { taskId: session.taskId, startTime, endTime };
}

// Position within the current set of Pomodoro rounds, from 1 to rounds.
export function currentRound(session: FocusSession, rounds: number) {
  const done = session.completedFocusRounds % rounds;
  if (session.phase === "longBreak") return rounds;
  if (session.phase === "shortBreak") return done === 0 ? rounds : done;
  return done + 1;
}

type LegacySession = FocusTask & {
  phase: FocusPhase;
  completedFocusRounds: number;
  endsAt: number | null;
  pausedRemainingMs: number;
};

const LEGACY_DURATION_MS: Record<FocusPhase, number> = {
  focus: minutes(25),
  shortBreak: minutes(5),
  longBreak: minutes(15),
};

// Sessions saved before timer modes stored the phase end instead of the
// elapsed time.
export function migrateLegacySession(legacy: LegacySession): FocusSession {
  const durationMs = LEGACY_DURATION_MS[legacy.phase];
  return {
    taskId: legacy.taskId,
    projectId: legacy.projectId,
    workspaceId: legacy.workspaceId,
    mode: "pomodoro",
    phase: legacy.phase,
    completedFocusRounds: legacy.completedFocusRounds,
    durationMs,
    elapsedMs: durationMs - legacy.pausedRemainingMs,
    runningSince:
      legacy.endsAt === null ? null : legacy.endsAt - legacy.pausedRemainingMs,
  };
}
