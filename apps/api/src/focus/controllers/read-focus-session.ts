import { eq, getTableColumns } from "drizzle-orm";
import db from "../../database";
import {
  focusSessionTable,
  projectTable,
  taskTable,
} from "../../database/schema";

export async function readFocusSession(userId: string) {
  const {
    userId: _,
    updatedAt: __,
    ...columns
  } = getTableColumns(focusSessionTable);
  const [session] = await db
    .select({
      ...columns,
      projectId: projectTable.id,
      workspaceId: projectTable.workspaceId,
    })
    .from(focusSessionTable)
    .innerJoin(taskTable, eq(focusSessionTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(focusSessionTable.userId, userId))
    .limit(1);
  return session ?? null;
}
