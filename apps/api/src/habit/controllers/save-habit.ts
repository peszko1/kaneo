import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { habitTable } from "../../database/schema";
import { habitOrThrow } from "./habit-or-throw";

export async function createHabit(userId: string, name: string) {
  const [habit] = await db
    .insert(habitTable)
    .values({
      userId,
      name,
      // New habits go to the end of the user's list.
      position: sql`(select coalesce(max(${habitTable.position}) + 1, 0) from ${habitTable} where ${habitTable.userId} = ${userId})`,
    })
    .returning();
  if (!habit) throw new Error("Failed to create habit");
  return {
    id: habit.id,
    name: habit.name,
    createdAt: habit.createdAt.toISOString(),
    doneCount: 0,
    checks: [],
  };
}

export async function renameHabit(id: string, userId: string, name: string) {
  await habitOrThrow(id, userId);
  await db.update(habitTable).set({ name }).where(eq(habitTable.id, id));
  return { id, name };
}

export async function deleteHabit(id: string, userId: string) {
  await habitOrThrow(id, userId);
  await db.delete(habitTable).where(eq(habitTable.id, id));
  return { id };
}

// Takes the caller's whole list, so positions stay a plain 0..n-1 sequence.
export async function reorderHabits(userId: string, ids: string[]) {
  const owned = await db
    .select({ id: habitTable.id })
    .from(habitTable)
    .where(eq(habitTable.userId, userId));
  const ownedIds = new Set(owned.map((habit) => habit.id));
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== ownedIds.size ||
    ids.some((id) => !ownedIds.has(id))
  )
    throw new HTTPException(400, {
      message: "The order must list each of your habits once",
    });

  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries())
      await tx
        .update(habitTable)
        .set({ position })
        .where(and(eq(habitTable.id, id), eq(habitTable.userId, userId)));
  });
  return { ids };
}
