import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { sendTaskEdit } from "./send-task-edit";

const fetchers = vi.hoisted(() => ({
  attachLabelToTask: vi.fn(),
  detachLabelFromTask: vi.fn(),
  getLabelsByTask: vi.fn(),
  getTask: vi.fn(),
  reorderTasks: vi.fn(),
  updateTask: vi.fn(),
}));
vi.mock("@/fetchers/label/attach-label-to-task", () => ({
  default: fetchers.attachLabelToTask,
}));
vi.mock("@/fetchers/label/detach-label-from-task", () => ({
  default: fetchers.detachLabelFromTask,
}));
vi.mock("@/fetchers/label/get-labels-by-task", () => ({
  default: fetchers.getLabelsByTask,
}));
vi.mock("@/fetchers/task/get-task", () => ({ default: fetchers.getTask }));
vi.mock("@/fetchers/task/reorder-tasks", () => ({
  default: fetchers.reorderTasks,
}));
vi.mock("@/fetchers/task/update-task", () => ({
  default: fetchers.updateTask,
}));

const label = {
  kind: "label" as const,
  taskId: "t1",
  projectId: "p1",
  name: "Bug",
  color: "red",
  workspaceLabelId: "w-bug",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendTaskEdit", () => {
  it("attaches the workspace label to the task", async () => {
    await sendTaskEdit({ ...label, attached: true });
    expect(fetchers.attachLabelToTask).toHaveBeenCalledWith({
      labelId: "w-bug",
      taskId: "t1",
    });
  });

  it("finds a label added offline by name before it removes it", async () => {
    fetchers.getLabelsByTask.mockResolvedValue([
      { id: "t-feature", name: "Feature" },
      { id: "t-bug", name: "Bug" },
    ]);
    await sendTaskEdit({ ...label, attached: false });
    expect(fetchers.detachLabelFromTask).toHaveBeenCalledWith({
      labelId: "t-bug",
    });
  });

  it("does nothing when the label is already gone", async () => {
    fetchers.getLabelsByTask.mockResolvedValue([]);
    await expect(
      sendTaskEdit({ ...label, attached: false }),
    ).resolves.toBeNull();
    expect(fetchers.detachLabelFromTask).not.toHaveBeenCalled();
  });

  it("refuses a start date someone else changed first", async () => {
    fetchers.getTask.mockResolvedValue({
      id: "t1",
      startDate: "2026-11-05T00:00:00.000Z",
    });
    await expect(
      sendTaskEdit({
        kind: "startDate",
        taskId: "t1",
        projectId: "p1",
        startDate: "2026-11-01T00:00:00.000Z",
        expected: null,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetchers.updateTask).not.toHaveBeenCalled();
  });

  it("puts the start date onto the task as the server has it", async () => {
    fetchers.getTask.mockResolvedValue({ id: "t1", title: "Newer title" });
    await sendTaskEdit({
      kind: "startDate",
      taskId: "t1",
      projectId: "p1",
      startDate: "2026-11-01T00:00:00.000Z",
    });
    expect(fetchers.updateTask).toHaveBeenCalledWith("t1", {
      id: "t1",
      title: "Newer title",
      startDate: "2026-11-01T00:00:00.000Z",
    });
  });

  it("sends only the move itself, not the queue's own fields", async () => {
    const move = {
      projectId: "p1",
      tasks: [{ id: "t1", position: 0, status: "done" }],
      expectedTasks: [{ id: "t1", position: 2, status: "to-do" }],
    };
    await sendTaskEdit({
      kind: "reorder",
      ...move,
      ...{ id: "queued-1", at: 1 },
    });
    expect(fetchers.reorderTasks).toHaveBeenCalledWith(move);
  });
});
