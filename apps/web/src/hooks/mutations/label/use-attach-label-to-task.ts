import { useMutation, useQueryClient } from "@tanstack/react-query";
import attachLabelToTask from "@/fetchers/label/attach-label-to-task";
import { saveTaskEdit } from "@/lib/offline/save-task-edit";
import { addLabelToTaskInTasksCache } from "./sync-task-labels-cache";

// The name, color and project let the change wait offline.
export type AttachLabel = {
  labelId: string;
  taskId: string;
  projectId: string;
  name: string;
  color: string;
};

export default function useAttachLabelToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { queuesOffline: true },
    // Runs offline too, where saveTaskEdit queues the change.
    networkMode: "always",
    mutationFn: ({ labelId, taskId, projectId, name, color }: AttachLabel) =>
      saveTaskEdit(
        {
          kind: "label",
          taskId,
          projectId,
          name,
          color,
          workspaceLabelId: labelId,
          attached: true,
        },
        () => attachLabelToTask({ labelId, taskId }),
      ),
    onSuccess: (attachedLabel) => {
      if (!attachedLabel?.taskId) return;

      if (attachedLabel.workspaceId) {
        queryClient.setQueryData(
          ["labels", attachedLabel.workspaceId],
          (existingLabels: Array<typeof attachedLabel> | undefined) => {
            if (!existingLabels) return [attachedLabel];
            if (existingLabels.some((label) => label.id === attachedLabel.id)) {
              return existingLabels;
            }
            return [...existingLabels, attachedLabel];
          },
        );
      }

      queryClient.setQueryData(
        ["labels", attachedLabel.taskId],
        (existingLabels: Array<typeof attachedLabel> | undefined) => {
          if (!existingLabels) return [attachedLabel];
          if (existingLabels.some((label) => label.id === attachedLabel.id)) {
            return existingLabels;
          }
          return [...existingLabels, attachedLabel];
        },
      );

      addLabelToTaskInTasksCache(queryClient, attachedLabel.taskId, {
        id: attachedLabel.id,
        name: attachedLabel.name,
        color: attachedLabel.color,
      });

      void queryClient.invalidateQueries({
        queryKey: ["labels", attachedLabel.taskId],
      });

      if (attachedLabel.workspaceId) {
        void queryClient.invalidateQueries({
          queryKey: ["labels", attachedLabel.workspaceId],
        });
      }
    },
  });
}
