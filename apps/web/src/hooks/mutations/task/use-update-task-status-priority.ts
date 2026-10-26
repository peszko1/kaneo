import {
  getBoardCacheVersion,
  markBoardCacheChanged,
} from "@/lib/board-cache-version";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateMyWork } from "@/lib/invalidate-my-work";
import updateTaskPriority from "@/fetchers/task/update-task-priority";
import { saveTaskEdit } from "@/lib/offline/save-task-edit";
import type Task from "@/types/task";
import { updateBoardTaskCache } from "@/lib/update-board-task-cache";

export function useUpdateTaskPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { queuesOffline: true },
    // Runs offline too, where saveTaskEdit queues the change.
    networkMode: "always",
    mutationFn: (task: Task) =>
      saveTaskEdit(
        {
          kind: "priority",
          taskId: task.id,
          projectId: task.projectId,
          priority: task.priority || "",
        },
        () => updateTaskPriority(task.id, task),
      ),
    onMutate: (task: Task) => {
      markBoardCacheChanged(queryClient, task.projectId, task.id);
      return {
        version: getBoardCacheVersion(queryClient, task.projectId, task.id),
      };
    },
    onSuccess: (updated, variables, context) => {
      invalidateMyWork(queryClient);
      queryClient.invalidateQueries({
        queryKey: ["task", variables.id],
      });
      if (updated)
        updateBoardTaskCache(
          queryClient,
          variables.projectId,
          variables.id,
          {
            priority: updated.priority,
          },
          context?.version,
        );
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", variables.id],
      });
    },
  });
}
