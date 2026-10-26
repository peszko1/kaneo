import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { withLockedTask } from "./with-locked-task";
import { assertFieldUnchanged } from "./assert-field-unchanged";
import { taskTable } from "../../database/schema";
import { publishTaskMutation } from "./task-mutation-effects";

async function updateTaskDescription({
  id,
  description,
  expected,
  currentUserId,
}: {
  id: string;
  description: string;
  expected?: string | null;
  currentUserId: string;
}) {
  const { before: existingTask, after: updatedTask } = await withLockedTask(
    id,
    async (tx, existingTask) => {
      // An empty description is stored as null or "".
      assertFieldUnchanged(
        existingTask.description ?? "",
        expected === undefined ? undefined : (expected ?? ""),
        description,
      );
      const [updatedTask] = await tx
        .update(taskTable)
        .set({ description })
        .where(eq(taskTable.id, id))
        .returning();

      if (!updatedTask) {
        throw new HTTPException(500, {
          message: "Failed to update task description",
        });
      }

      return updatedTask;
    },
  );

  await publishTaskMutation(existingTask, updatedTask, currentUserId, {
    fields: ["description"],
  });

  return updatedTask;
}

export default updateTaskDescription;
