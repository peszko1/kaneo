import type { BoardMeta, BoardTasksQuery } from "../api/types";
import type { KaneoQuery } from "./vocabulary";

export type BoardParamsResult =
  | { ok: true; params: BoardTasksQuery[] }
  | { ok: false; error: string };

const PAGE_LIMIT = "100";

/** Monday 00:00 in the caller's time zone, so week filters match their calendar. */
export function localWeekStart(now: Date): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start.toISOString();
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function resolveProjects(keys: string[], meta: BoardMeta) {
  const ids: string[] = [];
  for (const key of keys) {
    const matches = meta.projects.filter(
      (project) => project.id === key || same(project.slug, key),
    );
    if (!matches.length) return { missing: key };
    ids.push(...matches.map((project) => project.id));
  }
  return { ids: [...new Set(ids)] };
}

function resolveAssignees(values: string[], meta: BoardMeta) {
  return values.map((value) => {
    if (value === "me" || value === "unassigned") return value;
    return (
      meta.assignees.find(
        (assignee) => assignee.id === value || same(assignee.name, value),
      )?.id ?? value
    );
  });
}

const optional = <T>(values: T[]) => (values.length ? values : undefined);

/** Turns a block query into one global board request per status. */
export function toBoardParams(
  query: KaneoQuery,
  meta: BoardMeta,
  now = new Date(),
): BoardParamsResult {
  const projects = resolveProjects(query.project, meta);
  if ("missing" in projects) {
    return {
      ok: false,
      error: `No project with the key "${projects.missing}" is visible to you.`,
    };
  }

  const base = {
    projectId: optional(projects.ids),
    assigneeId: optional(resolveAssignees(query.assignee, meta)),
    priority: optional(query.priority),
    label: optional(query.label),
    dueDate: optional(query.due),
    dueWeekStart: query.due.length ? localWeekStart(now) : undefined,
    q: query.q,
    page: "1",
    limit: PAGE_LIMIT,
  };

  return {
    ok: true,
    params: query.status.map((globalStatus) => ({ ...base, globalStatus })),
  };
}
