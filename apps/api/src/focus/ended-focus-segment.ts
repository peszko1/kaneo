// Shorter focus stretches, like a quick start and pause, are not recorded.
export const MIN_RECORDED_MS = 60_000;

type TimerState = {
  taskId: string;
  phase: string;
  durationMs: number | null;
  elapsedMs: number;
  runningSince: number | null;
};

// The focus time a change ends: from when the timer last started until the
// change, cut at the phase end. Breaks are never recorded. `at` is when the
// change happened, which is earlier than now for a change made offline.
export function endedFocusSegment(
  previous: TimerState,
  next: TimerState | null,
  at: number,
) {
  const start = previous.runningSince;
  if (previous.phase !== "focus" || start === null) return null;
  if (
    next &&
    next.runningSince === start &&
    next.taskId === previous.taskId &&
    next.phase === previous.phase
  )
    return null;

  const phaseEnd =
    previous.durationMs === null
      ? Number.POSITIVE_INFINITY
      : start + previous.durationMs - previous.elapsedMs;
  const end = Math.min(at, phaseEnd);
  if (end - start < MIN_RECORDED_MS) return null;
  return { taskId: previous.taskId, startTime: start, endTime: end };
}
