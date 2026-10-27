import { and, eq, isNull } from "drizzle-orm";
import db from "../../database";
import { labelTable } from "../../database/schema";
import createLabel from "./create-label";

// Runs after the subtask relation exists, so a label that fails to copy never
// undoes the link; it is logged and the rest still apply. Names the child
// already carries are left as they are.
export async function copyParentLabels(task: {
  parentId: string;
  childId: string;
  workspaceId: string;
  userId: string;
}) {
  const labels = await db
    .select({ name: labelTable.name, color: labelTable.color })
    .from(labelTable)
    .where(
      and(
        eq(labelTable.taskId, task.parentId),
        isNull(labelTable.deletionStartedAt),
      ),
    );
  for (const label of labels) {
    try {
      await createLabel(
        label.name,
        label.color,
        task.childId,
        task.workspaceId,
        task.userId,
      );
    } catch (error) {
      console.error("Failed to copy a parent label to a subtask:", error);
    }
  }
}
