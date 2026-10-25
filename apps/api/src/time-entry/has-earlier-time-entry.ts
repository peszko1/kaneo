import { and, eq, gte, ne } from "drizzle-orm";
import db from "../database";
import { timeEntryTable } from "../database/schema";

const WINDOW_MS = 12 * 60 * 60 * 1000;

// Focus sessions log a time entry every round, so the task owner hears only
// about the first one a person logs on a task within the window.
export async function hasEarlierTimeEntry({
  timeEntryId,
  taskId,
  userId,
  now = new Date(),
}: {
  timeEntryId: string;
  taskId: string;
  userId: string;
  now?: Date;
}) {
  const [earlier] = await db
    .select({ id: timeEntryTable.id })
    .from(timeEntryTable)
    .where(
      and(
        eq(timeEntryTable.taskId, taskId),
        eq(timeEntryTable.userId, userId),
        ne(timeEntryTable.id, timeEntryId),
        gte(timeEntryTable.createdAt, new Date(now.getTime() - WINDOW_MS)),
      ),
    )
    .limit(1);

  return Boolean(earlier);
}
