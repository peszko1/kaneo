import { and, eq, exists, inArray, type SQL, sql } from "drizzle-orm";
import db from "../../database";
import {
  columnTable,
  globalBoardOrderTable,
  projectTable,
  taskTable,
} from "../../database/schema";

const priorityRank = sql<number>`CASE
  WHEN ${taskTable.priority} = 'urgent' THEN 4
  WHEN ${taskTable.priority} = 'high' THEN 3
  WHEN ${taskTable.priority} = 'medium' THEN 2
  WHEN ${taskTable.priority} = 'low' THEN 1
  ELSE 0
END`;

// A task belongs to the global status of the column its status slug names.
export function inColumns(columnIds: string[]) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(columnTable)
      .where(
        and(
          eq(columnTable.projectId, taskTable.projectId),
          eq(columnTable.slug, taskTable.status),
          inArray(columnTable.id, columnIds),
        ),
      ),
  );
}

/**
 * One page of a lane's task ids, in board order. The caller's own arrangement
 * (then priority, due date, newest) decides where each project column's cards
 * sit, but the cards of one project column always fill those slots in their
 * project board order, so both boards agree on which of them comes first.
 */
export async function laneOrder(
  where: SQL | undefined,
  userId: string,
  limit: number,
  offset: number,
) {
  const personalOrder = sql`${globalBoardOrderTable.position} asc nulls last, ${priorityRank} desc, ${taskTable.dueDate} asc nulls last, ${taskTable.createdAt} desc, ${taskTable.id} asc`;
  const ranked = db
    .select({
      id: sql`${taskTable.id}`.as("id"),
      projectId: sql`${taskTable.projectId}`.as("project_id"),
      status: sql`${taskTable.status}`.as("status"),
      slot: sql`row_number() over (order by ${personalOrder})`.as("slot"),
      slotInColumn:
        sql`row_number() over (partition by ${taskTable.projectId}, ${taskTable.status} order by ${personalOrder})`.as(
          "slot_in_column",
        ),
      columnRank:
        sql`row_number() over (partition by ${taskTable.projectId}, ${taskTable.status} order by ${taskTable.position} asc nulls last, ${taskTable.id} asc)`.as(
          "column_rank",
        ),
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(
      globalBoardOrderTable,
      and(
        eq(globalBoardOrderTable.taskId, taskTable.id),
        eq(globalBoardOrderTable.userId, userId),
      ),
    )
    .where(where);
  const result = await db.execute<{ id: string }>(sql`
    with ranked as (${ranked})
    select task.id
    from ranked task
    join ranked slot
      on slot.project_id = task.project_id
      and slot.status = task.status
      and slot.slot_in_column = task.column_rank
    order by slot.slot
    limit ${limit} offset ${offset}
  `);
  return result.rows.map((row) => row.id);
}
