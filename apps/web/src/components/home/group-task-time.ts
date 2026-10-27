type TaskTime = {
  taskId: string;
  taskNumber: number | null;
  taskTitle: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  projectIcon: string | null;
  totalSeconds: number;
};

export type ProjectTime = {
  projectId: string;
  name: string;
  slug: string;
  icon: string | null;
  totalSeconds: number;
  tasks: TaskTime[];
};

// Groups per-task time by project, the project with the most time first.
// Tasks keep their order, which is most time first.
export function groupTaskTime(tasks: TaskTime[]): ProjectTime[] {
  const projects = new Map<string, ProjectTime>();
  for (const task of tasks) {
    const project = projects.get(task.projectId) ?? {
      projectId: task.projectId,
      name: task.projectName,
      slug: task.projectSlug,
      icon: task.projectIcon,
      totalSeconds: 0,
      tasks: [],
    };
    project.totalSeconds += task.totalSeconds;
    project.tasks.push(task);
    projects.set(task.projectId, project);
  }
  return [...projects.values()].sort((a, b) => b.totalSeconds - a.totalSeconds);
}
