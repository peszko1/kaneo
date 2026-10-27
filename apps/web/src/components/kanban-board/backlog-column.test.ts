import { describe, expect, it } from "vite-plus/test";
import type { ProjectWithTasks } from "@/types/project";
import { withBacklogColumn, withoutBacklogColumn } from "./backlog-column";
import { moveBoardTask } from "./move-task";

function board() {
  return {
    id: "project",
    columns: [
      {
        id: "todo",
        slug: "todo",
        tasks: [{ id: "a", status: "todo", position: 0 }],
      },
    ],
    plannedTasks: [{ id: "p", status: "planned", position: 0 }],
    archivedTasks: [],
  } as unknown as ProjectWithTasks;
}

describe("backlog column", () => {
  it("moves a backlog task onto the board and back", () => {
    const toBoard = moveBoardTask(
      withBacklogColumn(board(), "Backlog"),
      "p",
      "a",
    );
    expect(toBoard?.tasks).toContainEqual({
      id: "p",
      position: 1,
      status: "todo",
    });
    const onBoard = withoutBacklogColumn(toBoard!.project);
    expect(onBoard.plannedTasks).toEqual([]);
    expect(onBoard.columns.map((column) => column.id)).toEqual(["todo"]);

    const back = moveBoardTask(
      withBacklogColumn(onBoard, "Backlog"),
      "a",
      "planned",
    );
    expect(back?.tasks).toContainEqual({
      id: "a",
      position: 0,
      status: "planned",
    });
    expect(
      withoutBacklogColumn(back!.project).plannedTasks.map((task) => task.id),
    ).toEqual(["a"]);
  });
});
