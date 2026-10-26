import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  clearEdits,
  queuedEdits,
  queueEdit,
  removeEdits,
  subscribeToEdits,
} from "./edit-outbox";

vi.mock("./saved-session", () => ({ savedSessionUserId: () => "user-1" }));

const status = (taskId: string, value: string) => ({
  kind: "status" as const,
  taskId,
  projectId: "p1",
  status: value,
});

beforeEach(() => {
  localStorage.clear();
  clearEdits();
});

describe("edit outbox", () => {
  it("keeps the newest edit of a field and moves it to the end", () => {
    queueEdit(status("t1", "to-do"));
    queueEdit(status("t2", "done"));
    queueEdit(status("t1", "in-progress"));

    expect(queuedEdits().map((edit) => [edit.taskId, edit.status])).toEqual([
      ["t2", "done"],
      ["t1", "in-progress"],
    ]);
  });

  it("stores the queue per user, where every tab reads it", () => {
    queueEdit(status("t1", "done"));
    expect(localStorage.getItem("kaneo:offline-edits:user-1")).toContain(
      '"t1"',
    );
  });

  it("removes sent edits and tells subscribers", () => {
    const listener = vi.fn();
    const stop = subscribeToEdits(listener);
    queueEdit(status("t1", "done"));
    removeEdits([queuedEdits()[0].id]);
    stop();

    expect(queuedEdits()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns the same array while nothing changed", () => {
    queueEdit(status("t1", "done"));
    expect(queuedEdits()).toBe(queuedEdits());
  });
});
