import { TriangleAlert } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUpdateTaskDescription } from "@/hooks/mutations/task/use-update-task-description";
import useGetTask from "@/hooks/queries/task/use-get-task";
import {
  descriptionConflict,
  resolveDescriptionConflict,
  subscribeToDescriptionConflicts,
} from "@/lib/offline/description-conflicts";
import { toast } from "@/lib/toast";

// Someone else changed the description while this one waited offline. The
// editor shows theirs; the user keeps one of the two.
export default function DescriptionConflictBar({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const { data: task } = useGetTask(taskId);
  const { mutateAsync: updateDescription, isPending } =
    useUpdateTaskDescription();
  const [showMine, setShowMine] = useState(false);
  const conflict = useSyncExternalStore(subscribeToDescriptionConflicts, () =>
    descriptionConflict(taskId),
  );
  if (!conflict || !task) return null;

  const keepMine = async () => {
    try {
      await updateDescription({ ...task, description: conflict.mine });
      resolveDescriptionConflict(taskId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:detail.editor.saveFailed"),
      );
    }
  };

  return (
    <Alert variant="warning" className="mt-4">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{t("tasks:detail.conflict.title")}</AlertTitle>
      <AlertDescription>
        <p>{t("tasks:detail.conflict.body")}</p>
        <Button
          variant="link"
          size="xs"
          className="h-auto self-start justify-self-start p-0"
          aria-expanded={showMine}
          onClick={() => setShowMine((shown) => !shown)}
        >
          {showMine
            ? t("tasks:detail.conflict.hideMine")
            : t("tasks:detail.conflict.showMine")}
        </Button>
        {showMine && (
          <pre className="mt-2 max-h-60 w-full overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 font-sans text-foreground text-xs">
            {conflict.mine}
          </pre>
        )}
      </AlertDescription>
      <AlertAction>
        <Button
          size="xs"
          variant="outline"
          disabled={isPending}
          onClick={() => resolveDescriptionConflict(taskId)}
        >
          {t("tasks:detail.conflict.useTheirs")}
        </Button>
        <Button size="xs" disabled={isPending} onClick={() => void keepMine()}>
          {t("tasks:detail.conflict.keepMine")}
        </Button>
      </AlertAction>
    </Alert>
  );
}
