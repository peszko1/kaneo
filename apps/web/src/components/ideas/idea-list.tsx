import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { useGetTasks } from "@/hooks/queries/task/use-get-tasks";
import { IdeaRow } from "./idea-row";

// The inbox backlog, newest idea first. Ideas moved onto the global board
// leave this list.
export function IdeaList({
  workspaceId,
  inboxId,
}: {
  workspaceId: string;
  inboxId: string;
}) {
  const { t } = useTranslation();
  const { data, isPending, isError } = useGetTasks(inboxId);
  const { data: projects = [] } = useGetProjects({ workspaceId });

  if (isPending)
    return (
      <Skeleton
        aria-label={t("common:empty.loading")}
        className="h-28 w-full"
      />
    );
  if (isError)
    return (
      <p role="alert" className="text-muted-foreground text-sm">
        {t("tasks:ideas.loadError")}
      </p>
    );

  const ideas = [...(data?.plannedTasks ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  if (ideas.length === 0)
    return (
      <p className="text-muted-foreground text-sm">{t("tasks:ideas.empty")}</p>
    );

  return (
    <ul className="flex flex-col">
      {ideas.map((idea) => (
        <IdeaRow
          key={idea.id}
          idea={idea}
          workspaceId={workspaceId}
          inboxId={inboxId}
          projects={projects.filter((project) => !project.archivedAt)}
        />
      ))}
    </ul>
  );
}
