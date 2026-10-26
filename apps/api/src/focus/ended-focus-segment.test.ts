import { describe, expect, it } from "vite-plus/test";
import { endedFocusSegment } from "./ended-focus-segment";

const minute = 60_000;
const running = {
  taskId: "task-a",
  phase: "focus",
  durationMs: 25 * minute,
  elapsedMs: 0,
  runningSince: 1_000_000,
};
const paused = { ...running, runningSince: null };

describe("endedFocusSegment", () => {
  it("records running focus time up to the change", () => {
    expect(
      endedFocusSegment(running, paused, running.runningSince + 10 * minute),
    ).toEqual({
      taskId: "task-a",
      startTime: running.runningSince,
      endTime: running.runningSince + 10 * minute,
    });
  });

  it("stops at the phase end when the change comes later", () => {
    const resumed = { ...running, elapsedMs: 5 * minute };
    expect(
      endedFocusSegment(resumed, null, resumed.runningSince + 60 * minute)
        ?.endTime,
    ).toBe(resumed.runningSince + 20 * minute);
  });

  it("counts up without a limit in Flowtime", () => {
    const flowtime = { ...running, durationMs: null };
    expect(
      endedFocusSegment(flowtime, null, flowtime.runningSince + 90 * minute)
        ?.endTime,
    ).toBe(flowtime.runningSince + 90 * minute);
  });

  it("records the old task when the timer moves to another task", () => {
    const moved = {
      ...running,
      taskId: "task-b",
      runningSince: running.runningSince + 5 * minute,
    };
    expect(endedFocusSegment(running, moved, moved.runningSince)?.taskId).toBe(
      "task-a",
    );
  });

  it("records nothing for a change that keeps the timer running", () => {
    expect(
      endedFocusSegment(
        running,
        { ...running },
        running.runningSince + 10 * minute,
      ),
    ).toBeNull();
  });

  it("records nothing for breaks, paused timers, or under a minute", () => {
    const later = running.runningSince + 10 * minute;
    expect(
      endedFocusSegment({ ...running, phase: "shortBreak" }, null, later),
    ).toBeNull();
    expect(endedFocusSegment(paused, null, later)).toBeNull();
    expect(
      endedFocusSegment(running, null, running.runningSince + 59_000),
    ).toBeNull();
  });
});
