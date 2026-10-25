import { and, count, eq, gte, isNotNull, lt, sum } from "drizzle-orm";
import db from "../../database";
import { projectTable, taskTable, timeEntryTable } from "../../database/schema";
import { projectAccessCondition } from "../../project-access/project-access-condition";

// The caller's own finished time in one workspace, limited to projects they
// can still see.
async function getTimeSummary({
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
  const [totals] = await db
    .select({
      totalSeconds: sum(timeEntryTable.duration),
      entryCount: count(),
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
    );

  return {
    totalSeconds: Number(totals?.totalSeconds ?? 0),
    entryCount: Number(totals?.entryCount ?? 0),
  };
}

export default getTimeSummary;
