import type { ProjectWithTasks } from "@/types/project";

// The backlog shows as the board's first column. Its id and slug are the
// virtual "planned" status, so a drop into it moves a task to the backlog.
export const BACKLOG_COLUMN_ID = "planned";

export function withBacklogColumn(
  project: ProjectWithTasks,
  name: string,
): ProjectWithTasks {
  return {
    ...project,
    columns: [
      {
        id: BACKLOG_COLUMN_ID,
        slug: BACKLOG_COLUMN_ID,
        name,
        position: -1,
        icon: null,
        isFinal: false,
        tasks: project.plannedTasks ?? [],
      },
      ...project.columns,
    ],
  };
}

export function withoutBacklogColumn(
  board: ProjectWithTasks,
): ProjectWithTasks {
  const backlog = board.columns.find(
    (column) => column.id === BACKLOG_COLUMN_ID,
  );
  if (!backlog) return board;
  return {
    ...board,
    columns: board.columns.filter((column) => column !== backlog),
    plannedTasks: backlog.tasks,
  };
}
