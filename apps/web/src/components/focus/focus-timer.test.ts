import { describe, expect, it } from "vite-plus/test";
import {
  advance,
  currentRound,
  DEFAULT_FOCUS_SETTINGS,
  displayMs,
  type FocusSettings,
  focusSegment,
  MIN_RECORDED_MS,
  migrateLegacySession,
  pause,
  resume,
  settle,
  startSession,
} from "./focus-timer";
import { formatCountdown } from "./format-countdown";

const task = { taskId: "t1", projectId: "p1", workspaceId: "w1" };
const pomodoro = DEFAULT_FOCUS_SETTINGS;
const flowtime: FocusSettings = { ...pomodoro, mode: "flowtime" };
const countdown: FocusSettings = { ...pomodoro, mode: "countdown" };
const min = (value: number) => value * 60_000;

describe("pomodoro", () => {
  it("starts a running focus round from the settings", () => {
    const session = startSession(task, { ...pomodoro, focusMinutes: 30 }, 0);
    expect(session.phase).toBe("focus");
    expect(displayMs(session, 0)).toBe(min(30));
    expect(displayMs(session, min(1))).toBe(min(29));
  });

  it("keeps the remaining time while paused", () => {
    const paused = pause(startSession(task, pomodoro, 0), min(1));
    expect(displayMs(paused, min(99))).toBe(min(24));
    expect(displayMs(resume(paused, min(50)), min(50))).toBe(min(24));
  });

  it("moves to a paused short break when focus runs out", () => {
    const session = startSession(task, pomodoro, 0);
    expect(settle(session, pomodoro, min(25) - 1)).toBe(session);

    const onBreak = settle(session, pomodoro, min(25));
    expect(onBreak.phase).toBe("shortBreak");
    expect(onBreak.completedFocusRounds).toBe(1);
    expect(onBreak.runningSince).toBeNull();
    expect(displayMs(onBreak, 0)).toBe(min(5));
  });

  it("takes a long break after the set number of rounds", () => {
    const settings = { ...pomodoro, roundsPerLongBreak: 2 };
    let session = startSession(task, settings, 0);
    const phases = [];
    for (let i = 0; i < 4; i++) {
      session = advance(session, settings, 0);
      phases.push(session.phase);
    }
    expect(phases).toEqual(["shortBreak", "focus", "longBreak", "focus"]);
    expect(displayMs(session, 0)).toBe(min(25));
  });

  it("counts rounds from 1 to the set number", () => {
    let session = startSession(task, pomodoro, 0);
    const rounds = [currentRound(session, 4)];
    for (let i = 0; i < 8; i++) {
      session = advance(session, pomodoro, 0);
      rounds.push(currentRound(session, 4));
    }
    expect(rounds).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 1]);
  });
});

describe("flowtime", () => {
  it("counts up and never runs out", () => {
    const session = startSession(task, flowtime, 0);
    expect(session.durationMs).toBeNull();
    expect(displayMs(session, min(90))).toBe(min(90));
    expect(settle(session, flowtime, min(999))).toBe(session);
  });

  it("gives a break of a fifth of the focus time, at least a minute", () => {
    const session = startSession(task, flowtime, 0);
    expect(advance(session, flowtime, min(50)).durationMs).toBe(min(10));
    expect(advance(session, flowtime, min(2)).durationMs).toBe(min(1));
  });
});

describe("countdown", () => {
  it("restarts the same countdown, paused, with no break", () => {
    const settings = { ...countdown, countdownMinutes: 45 };
    const session = startSession(task, settings, 0);
    const next = settle(session, settings, min(45));
    expect(next.phase).toBe("focus");
    expect(next.runningSince).toBeNull();
    expect(next.completedFocusRounds).toBe(1);
    expect(displayMs(next, 0)).toBe(min(45));
  });
});

describe("focusSegment", () => {
  it("covers the focus time since the timer last started", () => {
    const resumed = resume(
      pause(startSession(task, pomodoro, 0), min(2)),
      min(8),
    );
    expect(focusSegment(resumed, min(13))).toEqual({
      taskId: "t1",
      startTime: min(8),
      endTime: min(13),
    });
  });

  it("ends at the phase end when settled late", () => {
    const session = startSession(task, pomodoro, 0);
    expect(focusSegment(session, min(99))?.endTime).toBe(min(25));
  });

  it("runs to now while Flowtime counts up", () => {
    const session = startSession(task, flowtime, 0);
    expect(focusSegment(session, min(99))?.endTime).toBe(min(99));
  });

  it("skips breaks, paused timers, and stretches under a minute", () => {
    const session = startSession(task, pomodoro, 0);
    expect(focusSegment(session, MIN_RECORDED_MS - 1)).toBeNull();
    expect(focusSegment(pause(session, min(2)), min(3))).toBeNull();
    const onBreak = resume(advance(session, pomodoro, 0), 0);
    expect(focusSegment(onBreak, min(2))).toBeNull();
  });
});

describe("migrateLegacySession", () => {
  it("keeps a running timer's end time", () => {
    const migrated = migrateLegacySession({
      ...task,
      phase: "focus",
      completedFocusRounds: 2,
      endsAt: min(30),
      pausedRemainingMs: min(20),
    });
    expect(displayMs(migrated, min(28))).toBe(min(2));
    expect(migrated.completedFocusRounds).toBe(2);
  });

  it("keeps a paused timer's remaining time", () => {
    const migrated = migrateLegacySession({
      ...task,
      phase: "shortBreak",
      completedFocusRounds: 1,
      endsAt: null,
      pausedRemainingMs: min(3),
    });
    expect(displayMs(migrated, 0)).toBe(min(3));
  });
});

describe("formatCountdown", () => {
  it("rounds up to whole seconds", () => {
    expect(formatCountdown(min(25))).toBe("25:00");
    expect(formatCountdown(59_001)).toBe("01:00");
    expect(formatCountdown(0)).toBe("00:00");
  });
});
