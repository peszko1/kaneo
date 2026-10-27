import { and, desc, eq, gte, isNotNull, lt, sum } from "drizzle-orm";
import db from "../../database";
import { projectTable, taskTable, timeEntryTable } from "../../database/schema";
import { projectAccessCondition } from "../../project-access/project-access-condition";

// The caller's own finished time per task in one workspace, limited to
// projects they can still see. Most time first.
async function getTaskTimeTotals({
  workspaceId,
  userId,
  from,
  to,
}: {
  workspaceId: string;
  userId: string;
  from: Date;
  to: Date;
}) {
  const totalSeconds = sum(timeEntryTable.duration).mapWith(Number);
  const rows = await db
    .select({
      taskId: taskTable.id,
      taskNumber: taskTable.number,
      taskTitle: taskTable.title,
      projectId: projectTable.id,
      projectName: projectTable.name,
      projectSlug: projectTable.slug,
      projectIcon: projectTable.icon,
      totalSeconds,
    })
    .from(timeEntryTable)
    .innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        eq(timeEntryTable.userId, userId),
        isNotNull(timeEntryTable.endTime),
        gte(timeEntryTable.startTime, from),
        lt(timeEntryTable.startTime, to),
        projectAccessCondition(userId, projectTable.id),
      ),
    )
    .groupBy(taskTable.id, projectTable.id)
    .orderBy(desc(totalSeconds), taskTable.id);

  return {
    tasks: rows.map((row) => ({ ...row, totalSeconds: row.totalSeconds ?? 0 })),
  };
}

export default getTaskTimeTotals;
