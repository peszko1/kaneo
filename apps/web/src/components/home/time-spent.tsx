import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatTrackedTime } from "@/components/task/properties/format-tracked-time";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import icons from "@/constants/project-icons";
import useGetRecentTaskTime from "@/hooks/queries/time-entry/use-get-recent-task-time";
import { groupTaskTime } from "./group-task-time";
import { SectionHeader } from "./section-header";

const RANGES = [1, 7, 30] as const;

export function TimeSpent({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const [days, setDays] = useState<number>(7);
  const { data, isPending, isError } = useGetRecentTaskTime(workspaceId, days);
  const projects = groupTaskTime(data?.tasks ?? []);
  const total = projects.reduce(
    (sum, project) => sum + project.totalSeconds,
    0,
  );
  const busiest = projects[0]?.totalSeconds ?? 0;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={t("workspace:home.timeSpent.title")}
        detail={total > 0 ? formatTrackedTime(total) : undefined}
        action={
          <ToggleGroup
            value={[String(days)]}
            onValueChange={(values) => {
              if (values[0]) setDays(Number(values[0]));
            }}
            size="sm"
            aria-label={t("workspace:home.timeSpent.range")}
            className="rounded-lg border border-input bg-background p-0.5 dark:bg-input/32"
          >
            {RANGES.map((range) => (
              <ToggleGroupItem
                key={range}
                value={String(range)}
                className="h-6 px-2"
              >
                {t("workspace:home.timeSpent.days", { count: range })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
      {isPending ? (
        <Skeleton
          aria-label={t("common:empty.loading")}
          className="h-28 w-full"
        />
      ) : isError ? (
        <p role="alert" className="text-muted-foreground text-sm">
          {t("workspace:home.timeSpent.loadError")}
        </p>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("workspace:home.timeSpent.empty", { count: days })}
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {projects.map((project) => {
            const ProjectIcon =
              icons[project.icon as keyof typeof icons] || icons.Layout;
            return (
              <li key={project.projectId} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ProjectIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
                    {project.name}
                  </span>
                  <span className="font-medium text-foreground text-sm tabular-nums">
                    {formatTrackedTime(project.totalSeconds)}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/80"
                    style={{
                      width: `${(project.totalSeconds / busiest) * 100}%`,
                    }}
                  />
                </div>
                <ul className="flex flex-col">
                  {project.tasks.map((task) => (
                    <li key={task.taskId}>
                      <Link
                        to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
                        params={{
                          workspaceId,
                          projectId: project.projectId,
                          taskId: task.taskId,
                        }}
                        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                          {project.slug.toUpperCase()}-{task.taskNumber}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {task.taskTitle}
                        </span>
                        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                          {formatTrackedTime(task.totalSeconds)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
