import type { QueryClient } from "@tanstack/react-query";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import type { TaskEdit } from "./task-edit";

function cachedTask(queryClient: QueryClient, edit: TaskEdit) {
  if (edit.kind === "reorder" || edit.kind === "label") return undefined;
  const task = queryClient.getQueryData<Task>(["task", edit.taskId]);
  if (task) return task;
  const board = queryClient.getQueryData<ProjectWithTasks>([
    "tasks",
    edit.projectId,
  ]);
  return [
    ...(board?.columns.flatMap((column) => column.tasks) ?? []),
    ...(board?.plannedTasks ?? []),
    ...(board?.archivedTasks ?? []),
  ].find((task) => task.id === edit.taskId);
}

function shownValue(task: Task, edit: TaskEdit) {
  switch (edit.kind) {
    case "status":
      return task.status;
    case "title":
      return task.title;
    case "priority":
      return task.priority;
    case "dueDate":
      return task.dueDate;
    case "startDate":
      return task.startDate;
    case "description":
      // A long description is left out of the board, so it is unknown.
      return task.descriptionDeferred ? undefined : (task.description ?? "");
    case "assignee":
      // Board tasks carry the assignee as `assigneeId` only.
      return task.userId !== undefined ? task.userId : task.assigneeId;
    default:
      return undefined;
  }
}

function newValue(edit: TaskEdit) {
  switch (edit.kind) {
    case "status":
      return edit.status;
    case "title":
      return edit.title;
    case "priority":
      return edit.priority;
    case "dueDate":
      return edit.dueDate;
    case "startDate":
      return edit.startDate;
    case "description":
      return edit.description;
    case "assignee":
      return edit.userId;
    default:
      return undefined;
  }
}

// The value this edit replaces, as this device shows it. Undefined when the
// task is not cached, or when a screen already shows the new value; the edit
// then applies without a check.
export function expectedValue(
  queryClient: QueryClient,
  edit: TaskEdit,
): string | null | undefined {
  const task = cachedTask(queryClient, edit);
  if (!task) return undefined;
  const shown = shownValue(task, edit);
  return shown === newValue(edit) ? undefined : shown;
}
