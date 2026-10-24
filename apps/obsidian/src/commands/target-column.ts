import type { BoardColumn } from "../api/types";

const byPosition = (a: BoardColumn, b: BoardColumn) => a.position - b.position;

/**
 * The column a checkbox moves a task into: the first final column when it is
 * checked, otherwise the first to-do column (or the first open one).
 */
export function targetColumn(
  columns: BoardColumn[],
  done: boolean,
): string | null {
  const sorted = [...columns].sort(byPosition);
  if (done) return sorted.find((column) => column.isFinal)?.slug ?? null;
  const open = sorted.filter((column) => !column.isFinal);
  return (
    (open.find((column) => column.globalStatus === "to-do") ?? open[0])?.slug ??
    null
  );
}

export function isFinalStatus(columns: BoardColumn[], status: string) {
  return columns.some((column) => column.slug === status && column.isFinal);
}
