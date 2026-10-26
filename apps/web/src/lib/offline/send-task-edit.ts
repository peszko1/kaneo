import attachLabelToTask from "@/fetchers/label/attach-label-to-task";
import detachLabelFromTask from "@/fetchers/label/detach-label-from-task";
import getLabelsByTask from "@/fetchers/label/get-labels-by-task";
import getTask from "@/fetchers/task/get-task";
import reorderTasks from "@/fetchers/task/reorder-tasks";
import updateTask from "@/fetchers/task/update-task";
import updateTaskAssignee from "@/fetchers/task/update-task-assignee";
import updateTaskDueDate from "@/fetchers/task/update-task-due-date";
import updateTaskPriority from "@/fetchers/task/update-task-priority";
import updateTaskStatus from "@/fetchers/task/update-task-status";
import updateTaskTitle from "@/fetchers/task/update-task-title";
import type Task from "@/types/task";
import type { TaskEdit } from "./task-edit";

async function sendLabelEdit(edit: Extract<TaskEdit, { kind: "label" }>) {
  if (edit.attached)
    return attachLabelToTask({
      labelId: edit.workspaceLabelId,
      taskId: edit.taskId,
    });
  const labelId =
    edit.taskLabelId ??
    (await getLabelsByTask({ taskId: edit.taskId })).find(
      (label) => label.name === edit.name,
    )?.id;
  // Already gone from the task.
  if (!labelId) return null;
  return detachLabelFromTask({ labelId });
}

export async function sendTaskEdit(edit: TaskEdit) {
  switch (edit.kind) {
    case "status":
      return updateTaskStatus(edit.taskId, { status: edit.status });
    case "title":
      return updateTaskTitle(edit.taskId, { title: edit.title } as Task);
    case "priority":
      return updateTaskPriority(edit.taskId, {
        priority: edit.priority,
      } as Task);
    case "dueDate":
      return updateTaskDueDate(edit.taskId, { dueDate: edit.dueDate } as Task);
    case "startDate": {
      // The start date has no endpoint of its own, so the edit goes onto
      // the task as the server has it now.
      const task = (await getTask(edit.taskId)) as unknown as Task;
      return updateTask(edit.taskId, { ...task, startDate: edit.startDate });
    }
    case "assignee":
      return updateTaskAssignee(edit.taskId, { userId: edit.userId });
    case "label":
      return sendLabelEdit(edit);
    case "reorder":
      return reorderTasks({
        projectId: edit.projectId,
        tasks: edit.tasks,
        expectedTasks: edit.expectedTasks,
      });
  }
}
