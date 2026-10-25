export const PRIORITIES = [
  "no-priority",
  "low",
  "medium",
  "high",
  "urgent",
] as const;
export const DUE_FILTERS = ["dueThisWeek", "dueNextWeek", "noDueDate"] as const;
export const STATUSES = ["to-do", "in-progress", "done"] as const;
export const GROUP_KEYS = ["project", "status", "priority", "label"] as const;
export const SORT_KEYS = [
  "due",
  "priority",
  "title",
  "project",
  "status",
] as const;
export const SHOW_FIELDS = [
  "ticket",
  "due",
  "project",
  "labels",
  "priority",
  "status",
  "assignee",
] as const;

export type Priority = (typeof PRIORITIES)[number];
export type DueFilter = (typeof DUE_FILTERS)[number];
export type Status = (typeof STATUSES)[number];
export type GroupKey = (typeof GROUP_KEYS)[number];
export type SortKey = (typeof SORT_KEYS)[number];
export type ShowField = (typeof SHOW_FIELDS)[number];

export type KaneoQuery = {
  name?: string;
  assignee: string[];
  project: string[];
  priority: Priority[];
  label: string[];
  due: DueFilter[];
  status: Status[];
  q?: string;
  groupBy?: GroupKey;
  sort: SortKey[];
  show: ShowField[];
  /** Seconds between refreshes; 0 turns it off, undefined uses the plugin default. */
  autorefresh?: number;
};
