import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import { OFFLINE_LABEL_ID, showTaskEdit } from "./show-task-edit";

const task = (id: string, status: string, position: number) =>
  ({ id, projectId: "p1", status, position, labels: [] }) as unknown as Task;

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient();
  queryClient.setQueryData(["tasks", "p1"], {
    id: "p1",
    columns: [
      {
        slug: "to-do",
        tasks: [task("t1", "to-do", 0), task("t2", "to-do", 1)],
      },
      { slug: "done", tasks: [] },
    ],
    plannedTasks: [],
    archivedTasks: [],
  });
});

const board = () =>
  queryClient.getQueryData<ProjectWithTasks>(["tasks", "p1"])!;
const column = (slug: string) =>
  board()
    .columns.find((column) => column.slug === slug)!
    .tasks.map((task) => task.id);

describe("showTaskEdit", () => {
  it("shows the assignee's name from a cached member list", () => {
    queryClient.setQueryData(
      ["workspace-users", "w1", "project", "p1"],
      [{ id: "u2", name: "Ada", image: null }],
    );
    showTaskEdit(queryClient, {
      kind: "assignee",
      taskId: "t1",
      projectId: "p1",
      userId: "u2",
    });
    expect(board().columns[0].tasks[0]).toMatchObject({
      assigneeId: "u2",
      assigneeName: "Ada",
    });
  });

  it("shows a move on the board", () => {
    showTaskEdit(queryClient, {
      kind: "reorder",
      projectId: "p1",
      tasks: [
        { id: "t2", position: 0, status: "done" },
        { id: "t1", position: 0 },
      ],
      expectedTasks: [],
    });
    expect(column("to-do")).toEqual(["t1"]);
    expect(column("done")).toEqual(["t2"]);
  });

  it("adds and removes a label by name", () => {
    queryClient.setQueryData(["labels", "t1"], []);
    const label = {
      kind: "label" as const,
      taskId: "t1",
      projectId: "p1",
      name: "Bug",
      color: "red",
      workspaceLabelId: "w-bug",
    };

    showTaskEdit(queryClient, { ...label, attached: true });
    expect(queryClient.getQueryData(["labels", "t1"])).toEqual([
      { id: `${OFFLINE_LABEL_ID}Bug`, name: "Bug", color: "red" },
    ]);
    expect(board().columns[0].tasks[0].labels).toHaveLength(1);

    showTaskEdit(queryClient, { ...label, attached: false });
    expect(queryClient.getQueryData(["labels", "t1"])).toEqual([]);
    expect(board().columns[0].tasks[0].labels).toEqual([]);
  });
});
