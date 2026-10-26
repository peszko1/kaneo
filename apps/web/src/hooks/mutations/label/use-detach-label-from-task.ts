import { useMutation, useQueryClient } from "@tanstack/react-query";
import detachLabelFromTask from "@/fetchers/label/detach-label-from-task";
import { saveTaskEdit } from "@/lib/offline/save-task-edit";
import { OFFLINE_LABEL_ID } from "@/lib/offline/show-task-edit";
import type { AttachLabel } from "./use-attach-label-to-task";
import { removeLabelFromTaskInTasksCache } from "./sync-task-labels-cache";

// `labelId` is the task's copy of the label, and `workspaceLabelId` the one
// it was copied from.
type DetachLabel = AttachLabel & { workspaceLabelId: string };

export default function useDetachLabelFromTask() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { queuesOffline: true },
    // Runs offline too, where saveTaskEdit queues the change.
    networkMode: "always",
    mutationFn: ({
      labelId,
      workspaceLabelId,
      taskId,
      projectId,
      name,
      color,
    }: DetachLabel) =>
      saveTaskEdit(
        {
          kind: "label",
          taskId,
          projectId,
          name,
          color,
          workspaceLabelId,
          attached: false,
          // A label added offline has no id on the server yet.
          taskLabelId: labelId.startsWith(OFFLINE_LABEL_ID)
            ? undefined
            : labelId,
        },
        () => detachLabelFromTask({ labelId }),
      ),
    onSuccess: (detachedLabel) => {
      if (!detachedLabel?.taskId) return;

      if (detachedLabel.workspaceId) {
        queryClient.setQueryData(
          ["labels", detachedLabel.workspaceId],
          (existingLabels: Array<typeof detachedLabel> | undefined) =>
            existingLabels?.filter((label) => label.id !== detachedLabel.id) ??
            [],
        );
      }

      queryClient.setQueryData(
        ["labels", detachedLabel.taskId],
        (existingLabels: Array<typeof detachedLabel> | undefined) =>
          existingLabels?.filter((label) => label.id !== detachedLabel.id) ??
          [],
      );

      removeLabelFromTaskInTasksCache(
        queryClient,
        detachedLabel.taskId,
        detachedLabel.id,
      );

      void queryClient.invalidateQueries({
        queryKey: ["labels", detachedLabel.taskId],
      });

      if (detachedLabel.workspaceId) {
        void queryClient.invalidateQueries({
          queryKey: ["labels", detachedLabel.workspaceId],
        });
      }
    },
  });
}
