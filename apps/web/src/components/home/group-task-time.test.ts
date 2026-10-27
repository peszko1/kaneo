import { describe, expect, it } from "vite-plus/test";
import { groupTaskTime } from "./group-task-time";

const task = (taskId: string, projectId: string, totalSeconds: number) => ({
  taskId,
  taskNumber: 1,
  taskTitle: taskId,
  projectId,
  projectName: projectId,
  projectSlug: projectId,
  projectIcon: null,
  totalSeconds,
});

describe("groupTaskTime", () => {
  it("sums tasks per project and puts the busiest project first", () => {
    const groups = groupTaskTime([
      task("a1", "alpha", 3000),
      task("b1", "beta", 2000),
      task("b2", "beta", 1500),
      task("a2", "alpha", 100),
    ]);

    expect(
      groups.map((group) => [
        group.projectId,
        group.totalSeconds,
        group.tasks.map((t) => t.taskId),
      ]),
    ).toEqual([
      ["beta", 3500, ["b1", "b2"]],
      ["alpha", 3100, ["a1", "a2"]],
    ]);
  });
});
