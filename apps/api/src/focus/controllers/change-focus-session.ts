import { eq } from "drizzle-orm";
import type { z } from "zod";
import db from "../../database";
import { focusSessionTable, timeEntryTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { announceTimeEntry } from "../../time-entry/controllers/create-time-entry";
import { resolveDuration } from "../../time-entry/duration";
import { endedFocusSegment } from "../ended-focus-segment";
import type { focusStateBody } from "../schema";
import { readFocusSession } from "./read-focus-session";

type FocusChange = {
  userId: string;
  baseVersion: number | null;
  at: number;
  // The new timer, or null to stop it.
  next: (z.infer<typeof focusStateBody> & { taskId: string }) | null;
  canLogTime: (taskId: string) => Promise<boolean>;
};

// Every device sends the same phase end, so only a change made on the stored
// version applies, and the focus time it ends is recorded once.
export async function changeFocusSession(change: FocusChange) {
  const { userId, next } = change;
  const result = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(focusSessionTable)
      .where(eq(focusSessionTable.userId, userId))
      .for("update");
    if ((current?.version ?? null) !== change.baseVersion) return null;

    if (next) {
      const values = {
        ...next,
        userId,
        version: (current?.version ?? 0) + 1,
        updatedAt: new Date(),
      };
      if (current) {
        await tx
          .update(focusSessionTable)
          .set(values)
          .where(eq(focusSessionTable.userId, userId));
      } else {
        const inserted = await tx
          .insert(focusSessionTable)
          .values(values)
          .onConflictDoNothing()
          .returning({ version: focusSessionTable.version });
        if (inserted.length === 0) return null;
      }
    } else if (current) {
      await tx
        .delete(focusSessionTable)
        .where(eq(focusSessionTable.userId, userId));
    }

    const segment =
      current &&
      endedFocusSegment(current, next, Math.min(change.at, Date.now()));
    if (!segment || !(await change.canLogTime(segment.taskId))) {
      return { entry: null };
    }
    const startTime = new Date(segment.startTime);
    const endTime = new Date(segment.endTime);
    const [entry] = await tx
      .insert(timeEntryTable)
      .values({
        taskId: segment.taskId,
        userId,
        description: "",
        startTime,
        endTime,
        duration: resolveDuration(startTime, endTime),
      })
      .returning();
    return { entry: entry ?? null };
  });

  if (result) {
    if (result.entry) await announceTimeEntry(result.entry);
    await publishEvent("focus-session.changed", { userId });
  }
  return {
    conflict: result === null,
    session: await readFocusSession(userId),
    recordedTaskId: result?.entry?.taskId ?? null,
  };
}
