import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { withLockedTask } from "./with-locked-task";
import { assertFieldUnchanged } from "./assert-field-unchanged";
import { taskTable } from "../../database/schema";
import { publishTaskMutation } from "./task-mutation-effects";
import {
  assertAssignableUser,
  getProjectWorkspaceId,
} from "../../utils/assert-assignable-user";

async function updateTaskAssignee({
  id,
  userId,
  expected,
  currentUserId,
}: {
  id: string;
  userId: string | null;
  expected?: string | null;
  currentUserId: string;
}) {
  const { before: existingTask, after: updatedTask } = await withLockedTask(
    id,
    async (tx, existingTask) => {
      const nextAssigneeId = userId?.trim() || null;
      assertFieldUnchanged(
        existingTask.userId,
        expected === undefined ? undefined : expected || null,
        nextAssigneeId,
      );
      if (existingTask.userId === nextAssigneeId) {
        return existingTask;
      }

      if (nextAssigneeId) {
        await assertAssignableUser(
          nextAssigneeId,
          await getProjectWorkspaceId(existingTask.projectId, tx),
          existingTask.projectId,
          tx,
        );
      }

      const [updatedTask] = await tx
        .update(taskTable)
        .set({ userId: nextAssigneeId })
        .where(eq(taskTable.id, id))
        .returning();

      if (!updatedTask) {
        throw new HTTPException(500, {
          message: "Failed to update task assignee",
        });
      }

      return updatedTask;
    },
  );

  await publishTaskMutation(existingTask, updatedTask, currentUserId, {
    fields: ["userId"],
  });

  return updatedTask;
}

export default updateTaskAssignee;
