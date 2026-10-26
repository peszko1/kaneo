import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { withLockedTask } from "./with-locked-task";
import { assertFieldUnchanged } from "./assert-field-unchanged";
import { taskTable } from "../../database/schema";
import { publishTaskMutation } from "./task-mutation-effects";

async function updateTaskPriority({
  id,
  priority,
  expected,
  currentUserId,
}: {
  id: string;
  priority: string;
  expected?: string;
  currentUserId: string;
}) {
  const { before: existingTask, after: updatedTask } = await withLockedTask(
    id,
    async (tx, existingTask) => {
      assertFieldUnchanged(existingTask.priority, expected, priority);
      const [updatedTask] = await tx
        .update(taskTable)
        .set({ priority })
        .where(eq(taskTable.id, id))
        .returning();

      if (!updatedTask) {
        throw new HTTPException(500, {
          message: "Failed to update task priority",
        });
      }

      return updatedTask;
    },
  );

  await publishTaskMutation(existingTask, updatedTask, currentUserId, {
    fields: ["priority"],
  });

  return updatedTask;
}

export default updateTaskPriority;
