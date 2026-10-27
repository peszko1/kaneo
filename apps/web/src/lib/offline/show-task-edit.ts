import type { QueryClient } from "@tanstack/react-query";
import { syncTaskLabelsInTasksCache } from "@/hooks/mutations/label/sync-task-labels-cache";
import { patchBoardTask } from "@/lib/patch-board-task";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import type { TaskEdit } from "./task-edit";

type TaskLabel = NonNullable<Task["labels"]>[number];

// Marks a task label shown before the server made it, which has no id yet.
export const OFFLINE_LABEL_ID = "offline-label:";

type Member = { id: string; name?: string | null; image?: string | null };

// The card shows the assignee's name, which the server adds. Offline it comes
// from any cached member list.
function cachedMember(queryClient: QueryClient, userId: string) {
  for (const [, members] of queryClient.getQueriesData<Member[]>({
    queryKey: ["workspace-users"],
  })) {
    if (!Array.isArray(members)) continue;
    const member = members.find((member) => member.id === userId);
    if (member) return member;
  }
  return null;
}

function fieldChange(
  queryClient: QueryClient,
  edit: TaskEdit,
): Partial<Task> | null {
  switch (edit.kind) {
    case "status":
      return { status: edit.status };
    case "title":
      return { title: edit.title };
    case "priority":
      return { priority: edit.priority };
    case "dueDate":
      return { dueDate: edit.dueDate };
    case "startDate":
      return { startDate: edit.startDate };
    case "description":
      return { description: edit.description };
    case "assignee": {
      const member = edit.userId
        ? cachedMember(queryClient, edit.userId)
        : null;
      return {
        userId: edit.userId,
        assigneeName: member?.name ?? null,
        assigneeImage: member?.image ?? null,
      };
    }
    default:
      return null;
  }
}

function showOnTask(
  queryClient: QueryClient,
  projectId: string,
  taskId: string,
  change: Partial<Task>,
) {
  queryClient.setQueryData<Task>(["task", taskId], (task) =>
    task ? { ...task, ...change } : task,
  );
  queryClient.setQueryData<ProjectWithTasks>(["tasks", projectId], (board) =>
    board
      ? (patchBoardTask(board, taskId, { projectId, ...change }) ?? board)
      : board,
  );
}

function showLabelEdit(
  queryClient: QueryClient,
  edit: Extract<TaskEdit, { kind: "label" }>,
) {
  const label: TaskLabel = {
    id: `${OFFLINE_LABEL_ID}${edit.name}`,
    name: edit.name,
    color: edit.color,
  };
  const update = (labels: TaskLabel[]) => {
    const others = labels.filter((existing) => existing.name !== edit.name);
    return edit.attached ? [...others, label] : others;
  };
  queryClient.setQueryData<TaskLabel[]>(["labels", edit.taskId], (labels) =>
    labels ? update(labels) : labels,
  );
  queryClient.setQueryData<Task>(["task", edit.taskId], (task) =>
    task?.labels ? { ...task, labels: update(task.labels) } : task,
  );
  syncTaskLabelsInTasksCache(queryClient, edit.taskId, update);
}

// Shows a queued edit in the cached task and board, as the server will.
export function showTaskEdit(queryClient: QueryClient, edit: TaskEdit) {
  if (edit.kind === "label") return showLabelEdit(queryClient, edit);
  if (edit.kind === "reorder") {
    for (const { id, ...change } of edit.tasks)
      showOnTask(queryClient, edit.projectId, id, change);
    return;
  }
  const change = fieldChange(queryClient, edit);
  if (change) showOnTask(queryClient, edit.projectId, edit.taskId, change);
}
