import type { QueryClient } from "@tanstack/react-query";
import updateTaskStatus from "@/fetchers/task/update-task-status";
import { patchBoardTask } from "@/lib/patch-board-task";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";

// A change to one field of one task that can wait for the server. Each one
// sets a value, so sending it twice does no harm.
export type TaskEdit = {
  kind: "status";
  taskId: string;
  projectId: string;
  status: string;
};

// A newer edit with the same key replaces the older one in the queue.
export const taskEditKey = (edit: TaskEdit) => `${edit.kind}:${edit.taskId}`;

export function sendTaskEdit(edit: TaskEdit) {
  return updateTaskStatus(edit.taskId, { status: edit.status });
}

// Shows a queued edit in the cached task and board, as the server will.
export function showTaskEdit(queryClient: QueryClient, edit: TaskEdit) {
  const change = { status: edit.status };
  queryClient.setQueryData<Task>(["task", edit.taskId], (task) =>
    task ? { ...task, ...change } : task,
  );
  queryClient.setQueryData<ProjectWithTasks>(
    ["tasks", edit.projectId],
    (board) =>
      board
        ? (patchBoardTask(board, edit.taskId, {
            projectId: edit.projectId,
            ...change,
          }) ?? board)
        : board,
  );
}
