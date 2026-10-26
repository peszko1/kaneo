import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTask from "@/fetchers/task/update-task";
import { invalidateMyWork } from "@/lib/invalidate-my-work";
import { saveTaskEdit } from "@/lib/offline/save-task-edit";
import type Task from "@/types/task";

export function useUpdateTaskStartDate() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { queuesOffline: true },
    // Runs offline too, where saveTaskEdit queues the change.
    networkMode: "always",
    mutationFn: (task: Task) =>
      saveTaskEdit(
        {
          kind: "startDate",
          taskId: task.id,
          projectId: task.projectId,
          startDate: task.startDate || null,
        },
        () => updateTask(task.id, task),
      ),
    onSuccess: (_, variables) => {
      invalidateMyWork(queryClient);
      queryClient.invalidateQueries({
        queryKey: ["task", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", variables.id],
      });
    },
  });
}
