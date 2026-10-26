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

const queuedStatuses = () =>
  queuedEdits().map((edit) =>
    edit.kind === "status" ? [edit.taskId, edit.status] : [],
  );

describe("edit outbox", () => {
  it("replaces the last edit when the new one sets the same field", () => {
    queueEdit(status("t1", "to-do"));
    queueEdit(status("t1", "in-progress"));

    expect(queuedStatuses()).toEqual([["t1", "in-progress"]]);
  });

  it("keeps the value the replaced edit expected", () => {
    queueEdit({ ...status("t1", "in-progress"), expected: "to-do" });
    queueEdit({ ...status("t1", "done"), expected: "in-progress" });

    expect(queuedEdits()).toMatchObject([
      { status: "done", expected: "to-do" },
    ]);
  });

  it("keeps older edits in order once another edit came between", () => {
    queueEdit(status("t1", "to-do"));
    queueEdit(status("t2", "done"));
    queueEdit(status("t1", "in-progress"));

    expect(queuedStatuses()).toEqual([
      ["t1", "to-do"],
      ["t2", "done"],
      ["t1", "in-progress"],
    ]);
  });

  it("never replaces a move", () => {
    const move = {
      kind: "reorder" as const,
      projectId: "p1",
      tasks: [{ id: "t1", position: 0 }],
      expectedTasks: [],
    };
    queueEdit(move);
    queueEdit(move);

    expect(queuedEdits()).toHaveLength(2);
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
