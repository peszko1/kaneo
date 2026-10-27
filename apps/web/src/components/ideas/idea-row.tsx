import { Link } from "@tanstack/react-router";
import { FolderInput } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { useMoveTask } from "@/hooks/mutations/task/use-move-task";
import type Task from "@/types/task";

type IdeaRowProps = {
  idea: Task;
  workspaceId: string;
  inboxId: string;
  projects: Array<{ id: string; name: string }>;
};

export function IdeaRow({
  idea,
  workspaceId,
  inboxId,
  projects,
}: IdeaRowProps) {
  const { t } = useTranslation();
  const { mutate: moveTask, isPending } = useMoveTask();

  return (
    <li className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent/40">
      <Link
        to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
        params={{ workspaceId, projectId: inboxId, taskId: idea.id }}
        className="min-w-0 flex-1 truncate rounded-sm py-0.5 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {idea.title}
      </Link>
      {projects.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              className="shrink-0 text-muted-foreground"
            >
              <FolderInput />
              {t("tasks:ideas.moveToProject")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {t("tasks:ideas.moveToProject")}
              </DropdownMenuLabel>
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() =>
                    moveTask({
                      taskId: idea.id,
                      destinationProjectId: project.id,
                    })
                  }
                >
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
