import type { BoardTask } from "../api/types";
import { type GroupKey, PRIORITIES, type SortKey } from "./vocabulary";

export type TaskGroup = { title: string | null; tasks: BoardTask[] };

// Most urgent first, as on the board.
const priorityRank = (task: BoardTask) =>
  -(PRIORITIES as readonly string[]).indexOf(task.priority);

const statusName = (task: BoardTask) => task.statusName ?? task.status;

const COMPARE: Record<SortKey, (a: BoardTask, b: BoardTask) => number> = {
  due: (a, b) => {
    if (a.dueDate === b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return Date.parse(a.dueDate) - Date.parse(b.dueDate);
  },
  priority: (a, b) => priorityRank(a) - priorityRank(b),
  title: (a, b) => a.title.localeCompare(b.title),
  project: (a, b) => a.projectName.localeCompare(b.projectName),
  status: (a, b) => statusName(a).localeCompare(statusName(b)),
};

export function sortTasks(tasks: BoardTask[], keys: SortKey[]) {
  if (!keys.length) return tasks;
  return [...tasks].sort((a, b) => {
    for (const key of keys) {
      const order = COMPARE[key](a, b);
      if (order) return order;
    }
    return 0;
  });
}

function groupTitles(task: BoardTask, key: GroupKey): string[] {
  switch (key) {
    case "project":
      return [task.projectName];
    case "status":
      return [statusName(task)];
    case "priority":
      return [task.priority];
    case "label":
      return task.labels.length
        ? task.labels.map((label) => label.name)
        : ["No label"];
  }
}

/** Sorts, then groups in first-seen order; a task with several labels shows under each. */
export function arrangeTasks(
  tasks: BoardTask[],
  groupBy: GroupKey | undefined,
  sort: SortKey[],
): TaskGroup[] {
  const sorted = sortTasks(tasks, sort);
  if (!groupBy) return [{ title: null, tasks: sorted }];

  const groups = new Map<string, BoardTask[]>();
  for (const task of sorted) {
    for (const title of groupTitles(task, groupBy)) {
      groups.set(title, [...(groups.get(title) ?? []), task]);
    }
  }
  return [...groups].map(([title, grouped]) => ({ title, tasks: grouped }));
}
