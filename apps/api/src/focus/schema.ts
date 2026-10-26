import { z } from "../openapi";

// Epoch milliseconds from the client's clock.
const epochMs = z.number().int().min(0).max(8_640_000_000_000_000);
const MAX_PHASE_MS = 30 * 86_400_000;

export const focusStateBody = z.object({
  mode: z.enum(["pomodoro", "flowtime", "countdown"]),
  phase: z.enum(["focus", "shortBreak", "longBreak"]),
  completedFocusRounds: z.number().int().min(0).max(100_000),
  durationMs: z.number().int().positive().max(MAX_PHASE_MS).nullable().openapi({
    description: "The phase length, or null while Flowtime focus counts up.",
  }),
  elapsedMs: z.number().int().min(0).max(MAX_PHASE_MS).openapi({
    description: "Time spent in the phase before `runningSince`.",
  }),
  runningSince: epochMs.nullable().openapi({
    description: "When the timer last started, or null while paused.",
  }),
  alarmAt: epochMs.nullable().openapi({
    description: "When the phase-end alarm started ringing, or null.",
  }),
});

const baseVersion = z.number().int().min(1).nullable().openapi({
  description:
    "The session version this change was made on, or null when the caller saw no session. A different stored version returns 409.",
});

const at = epochMs.openapi({
  description:
    "When the change happened. Focus time that the change ends is recorded up to here, so a change made offline records the right time.",
});

export const saveFocusSessionBody = z.object({
  taskId: z.string(),
  baseVersion,
  at,
  state: focusStateBody,
});

export const stopFocusSessionBody = z.object({
  baseVersion: z.number().int().min(1),
  at,
});
