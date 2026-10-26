import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { HttpError } from "@/lib/http-error";
import { useFocusStore } from "@/store/focus";
import {
  queueFocusChange,
  readFocusVersion,
  readOutbox,
  writeFocusVersion,
  writeOutbox,
} from "./focus-outbox";
import { syncFocusSession } from "./focus-sync";

const sendFocusChange = vi.hoisted(() => vi.fn());
const getFocusSession = vi.hoisted(() => vi.fn());
vi.mock("@/fetchers/focus/send-focus-change", () => ({
  default: sendFocusChange,
}));
vi.mock("@/fetchers/focus/get-focus-session", () => ({
  default: getFocusSession,
}));

const timer = {
  taskId: "t1",
  projectId: "p1",
  workspaceId: "w1",
  mode: "pomodoro" as const,
  phase: "focus" as const,
  completedFocusRounds: 0,
  durationMs: 1_500_000,
  elapsedMs: 0,
  runningSince: 1_000,
  alarmAt: null,
};
const saved = (version: number, recordedTaskId: string | null = null) => ({
  conflict: false,
  result: { session: { ...timer, version }, recordedTaskId },
});

// Queues without starting a sync, so each test runs exactly one.
const enqueue = (...changes: Parameters<typeof queueFocusChange>[0][]) =>
  writeOutbox([...readOutbox(), ...changes]);

describe("syncFocusSession", () => {
  beforeEach(() => {
    localStorage.clear();
    sendFocusChange.mockReset();
    getFocusSession.mockReset();
    useFocusStore.setState(useFocusStore.getInitialState());
  });

  it("sends changes in order, each on the version the last one made", async () => {
    writeFocusVersion(4);
    enqueue({ at: 1, next: timer }, { at: 2, next: null });
    sendFocusChange.mockResolvedValueOnce(saved(5)).mockResolvedValueOnce({
      conflict: false,
      result: { session: null, recordedTaskId: "t1" },
    });
    getFocusSession.mockResolvedValue({ session: null });

    await syncFocusSession();

    expect(sendFocusChange.mock.calls.map(([call]) => call)).toEqual([
      { baseVersion: 4, at: 1, next: timer },
      { baseVersion: 5, at: 2, next: null },
    ]);
    expect(readOutbox()).toEqual([]);
    expect(readFocusVersion()).toBeNull();
  });

  it("shows the other device's timer and drops queued changes on a conflict", async () => {
    writeFocusVersion(1);
    enqueue({ at: 1, next: timer }, { at: 2, next: null });
    sendFocusChange.mockResolvedValueOnce({
      conflict: true,
      result: {
        session: { ...timer, phase: "shortBreak", version: 3 },
        recordedTaskId: null,
      },
    });

    await syncFocusSession();

    expect(sendFocusChange).toHaveBeenCalledTimes(1);
    expect(readOutbox()).toEqual([]);
    expect(readFocusVersion()).toBe(3);
    expect(useFocusStore.getState().session?.phase).toBe("shortBreak");
  });

  it("keeps changes for later while offline", async () => {
    enqueue({ at: 1, next: timer });
    sendFocusChange.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await syncFocusSession();

    expect(readOutbox()).toHaveLength(1);
    expect(getFocusSession).not.toHaveBeenCalled();
  });

  it("drops a change the server refuses and takes its timer", async () => {
    enqueue({ at: 1, next: timer });
    sendFocusChange.mockRejectedValueOnce(new HttpError(403, "No access"));
    getFocusSession.mockResolvedValue({ session: { ...timer, version: 2 } });

    await syncFocusSession();

    expect(readOutbox()).toEqual([]);
    expect(readFocusVersion()).toBe(2);
    expect(useFocusStore.getState().session?.taskId).toBe("t1");
  });

  it("does not upload a refused timer again", async () => {
    const { alarmAt: _, ...session } = timer;
    useFocusStore.setState({ session });
    enqueue({ at: 1, next: timer });
    sendFocusChange.mockRejectedValue(new HttpError(404, "Task not found"));
    getFocusSession.mockResolvedValue({ session: null });

    await syncFocusSession();

    expect(useFocusStore.getState().session).toBeNull();
    expect(readOutbox()).toEqual([]);
    expect(sendFocusChange).toHaveBeenCalledTimes(1);
  });

  it("takes a newer timer from the server", async () => {
    writeFocusVersion(1);
    getFocusSession.mockResolvedValue({ session: { ...timer, version: 2 } });

    await syncFocusSession();

    expect(readFocusVersion()).toBe(2);
    expect(useFocusStore.getState().session?.runningSince).toBe(1_000);
  });

  it("saves a timer that ran before the server kept one", async () => {
    const { alarmAt: _, ...session } = timer;
    useFocusStore.setState({ session });
    getFocusSession.mockResolvedValueOnce({ session: null });
    getFocusSession.mockResolvedValue({ session: { ...timer, version: 1 } });
    sendFocusChange.mockResolvedValue(saved(1));

    await syncFocusSession();
    // The queued upload starts its own sync.
    await vi.waitFor(() => expect(sendFocusChange).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(readFocusVersion()).toBe(1));

    expect(sendFocusChange.mock.calls[0]?.[0].baseVersion).toBeNull();
    expect(useFocusStore.getState().session?.taskId).toBe("t1");
  });
});
