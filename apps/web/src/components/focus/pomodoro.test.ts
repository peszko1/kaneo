import { describe, expect, it } from "vite-plus/test";
import { formatCountdown } from "./format-countdown";
import {
  advance,
  currentRound,
  focusSegment,
  MIN_RECORDED_MS,
  PHASE_DURATION_MS,
  pause,
  remainingMs,
  resume,
  settle,
  startSession,
} from "./pomodoro";

const task = { taskId: "t1", projectId: "p1", workspaceId: "w1" };

describe("pomodoro", () => {
  it("starts a running 25-minute focus round", () => {
    const session = startSession(task, 1000);
    expect(session.phase).toBe("focus");
    expect(remainingMs(session, 1000)).toBe(PHASE_DURATION_MS.focus);
    expect(remainingMs(session, 61_000)).toBe(PHASE_DURATION_MS.focus - 60_000);
  });

  it("keeps the remaining time while paused", () => {
    const paused = pause(startSession(task, 0), 60_000);
    expect(paused.endsAt).toBeNull();
    expect(remainingMs(paused, 999_999)).toBe(PHASE_DURATION_MS.focus - 60_000);

    const resumed = resume(paused, 100_000);
    expect(remainingMs(resumed, 100_000)).toBe(
      PHASE_DURATION_MS.focus - 60_000,
    );
  });

  it("moves to a paused short break when focus runs out", () => {
    const session = startSession(task, 0);
    expect(settle(session, PHASE_DURATION_MS.focus - 1)).toBe(session);

    const onBreak = settle(session, PHASE_DURATION_MS.focus);
    expect(onBreak.phase).toBe("shortBreak");
    expect(onBreak.completedFocusRounds).toBe(1);
    expect(onBreak.endsAt).toBeNull();
    expect(remainingMs(onBreak, 0)).toBe(PHASE_DURATION_MS.shortBreak);
  });

  it("takes a long break after every fourth focus round", () => {
    let session = startSession(task, 0);
    const phases = [];
    for (let i = 0; i < 8; i++) {
      session = advance(session);
      phases.push(session.phase);
    }
    expect(phases).toEqual([
      "shortBreak",
      "focus",
      "shortBreak",
      "focus",
      "shortBreak",
      "focus",
      "longBreak",
      "focus",
    ]);
  });

  it("counts rounds from 1 to 4", () => {
    let session = startSession(task, 0);
    const rounds = [currentRound(session)];
    for (let i = 0; i < 8; i++) {
      session = advance(session);
      rounds.push(currentRound(session));
    }
    expect(rounds).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 1]);
  });
});

describe("focusSegment", () => {
  it("covers the focus time since the timer last started", () => {
    const resumed = resume(pause(startSession(task, 0), 120_000), 500_000);
    expect(focusSegment(resumed, 800_000)).toEqual({
      taskId: "t1",
      startTime: 500_000,
      endTime: 800_000,
    });
  });

  it("ends at the phase end when settled late", () => {
    const session = startSession(task, 0);
    expect(focusSegment(session, PHASE_DURATION_MS.focus + 999_999)).toEqual({
      taskId: "t1",
      startTime: 0,
      endTime: PHASE_DURATION_MS.focus,
    });
  });

  it("skips breaks, paused timers, and stretches under a minute", () => {
    const session = startSession(task, 0);
    expect(focusSegment(session, MIN_RECORDED_MS - 1)).toBeNull();
    expect(focusSegment(pause(session, 120_000), 130_000)).toBeNull();
    const onBreak = resume(advance(session), 0);
    expect(focusSegment(onBreak, 120_000)).toBeNull();
  });
});

describe("formatCountdown", () => {
  it("rounds up to whole seconds", () => {
    expect(formatCountdown(PHASE_DURATION_MS.focus)).toBe("25:00");
    expect(formatCountdown(59_001)).toBe("01:00");
    expect(formatCountdown(0)).toBe("00:00");
  });
});
