import { CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useUpdateTaskStatus } from "@/hooks/mutations/task/use-update-task-status";
import { useGetColumns } from "@/hooks/queries/column/use-get-columns";
import useGetTask from "@/hooks/queries/task/use-get-task";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import { useFocusStore } from "@/store/focus";

// Moves the task to the first done column and ends the focus session.
export function FocusDoneButton({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const { data: task } = useGetTask(taskId);
  const { data: columns = [] } = useGetColumns(task?.projectId ?? "");
  const { mutateAsync: updateTaskStatus, isPending } = useUpdateTaskStatus();
  const { canUpdateTasks } = useWorkspacePermission();
  const stop = useFocusStore((state) => state.stop);
  const done = columns.find((column) => column.isFinal);

  if (!task || !done || !canUpdateTasks()) return null;
  if (columns.some((column) => column.isFinal && column.slug === task.status)) {
    return null;
  }

  return (
    <Button
      size="lg"
      variant="ghost"
      disabled={isPending}
      onClick={async () => {
        try {
          await updateTaskStatus({ ...task, status: done.slug });
          stop();
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : t("tasks:popover.status.updateError"),
          );
        }
      }}
    >
      <CircleCheck />
      {t("tasks:focus.actions.markDone")}
    </Button>
  );
}
