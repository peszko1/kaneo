import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  clearDescriptionConflicts,
  descriptionConflict,
  keepDescriptionConflict,
  resolveDescriptionConflict,
  subscribeToDescriptionConflicts,
} from "./description-conflicts";

vi.mock("./saved-session", () => ({ savedSessionUserId: () => "user-1" }));

const conflict = (taskId: string, mine: string) => ({
  taskId,
  projectId: "p1",
  mine,
  at: 1,
});

beforeEach(() => {
  localStorage.clear();
  clearDescriptionConflicts();
});

describe("description conflicts", () => {
  it("keeps the newest conflict per task, per user", () => {
    keepDescriptionConflict(conflict("t1", "First"));
    keepDescriptionConflict(conflict("t1", "Second"));

    expect(descriptionConflict("t1")?.mine).toBe("Second");
    expect(
      localStorage.getItem("kaneo:offline-description-conflicts:user-1"),
    ).toContain("Second");
  });

  it("removes a conflict once the user chooses and tells subscribers", () => {
    const listener = vi.fn();
    const stop = subscribeToDescriptionConflicts(listener);
    keepDescriptionConflict(conflict("t1", "Mine"));
    resolveDescriptionConflict("t1");
    stop();

    expect(descriptionConflict("t1")).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns the same object while nothing changed", () => {
    keepDescriptionConflict(conflict("t1", "Mine"));
    expect(descriptionConflict("t1")).toBe(descriptionConflict("t1"));
  });
});
