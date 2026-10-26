import { and, eq, isNotNull, sum } from "drizzle-orm";
import db from "../../database";
import { projectTable, taskTable, timeEntryTable } from "../../database/schema";
import { projectAccessCondition } from "../../project-access/project-access-condition";

// Everyone's finished time on each project the caller can see. Projects
// without tracked time are left out.
async function getProjectTimeTotals({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  const rows = await db
    .select({
      projectId: projectTable.id,
      totalSeconds: sum(timeEntryTable.duration).mapWith(Number),
    })
    .from(timeEntryTable)
    .innerJoin(taskTable, eq(timeEntryTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        isNotNull(timeEntryTable.endTime),
        projectAccessCondition(userId, projectTable.id),
      ),
    )
    .groupBy(projectTable.id);

  return {
    projects: rows.map((row) => ({
      projectId: row.projectId,
      totalSeconds: row.totalSeconds ?? 0,
    })),
  };
}

export default getProjectTimeTotals;
