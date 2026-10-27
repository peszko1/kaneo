import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import { IdeaCapture } from "@/components/ideas/idea-capture";
import { IdeaList } from "@/components/ideas/idea-list";
import PageTitle from "@/components/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import useGetInboxProject from "@/hooks/queries/project/use-get-inbox-project";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/ideas",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = Route.useParams();
  const { data: inbox, isError } = useGetInboxProject(workspaceId);

  return (
    <>
      <PageTitle title={t("tasks:ideas.title")} />
      <WorkspaceLayout title={t("tasks:ideas.title")}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
            <header className="flex flex-col gap-1">
              <h1 className="font-semibold text-2xl text-foreground tracking-tight">
                {t("tasks:ideas.title")}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t("tasks:ideas.description")}
              </p>
            </header>
            {isError ? (
              <p role="alert" className="text-muted-foreground text-sm">
                {t("tasks:ideas.loadError")}
              </p>
            ) : !inbox ? (
              <Skeleton
                aria-label={t("common:empty.loading")}
                className="h-9 w-full"
              />
            ) : (
              <>
                <IdeaCapture inboxId={inbox.id} />
                <IdeaList workspaceId={workspaceId} inboxId={inbox.id} />
              </>
            )}
          </div>
        </div>
      </WorkspaceLayout>
    </>
  );
}
