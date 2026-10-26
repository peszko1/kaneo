import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateMyWork } from "@/lib/invalidate-my-work";
import { saveTaskEdit } from "@/lib/offline/save-task-edit";
import type Task from "@/types/task";

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { queuesOffline: true },
    // Runs offline too, where saveTaskEdit queues the change.
    networkMode: "always",
    mutationFn: (task: Task) =>
      saveTaskEdit({
        kind: "status",
        taskId: task.id,
        projectId: task.projectId,
        status: task.status || "",
      }),
    onSuccess: (_, variables) => {
      invalidateMyWork(queryClient);
      queryClient.invalidateQueries({
        queryKey: ["task", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-relations"],
      });
    },
  });
}
