import { eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../database";
import { projectTable, taskTable } from "../../database/schema";
import { assertProjectAccess } from "../../project-access/assert-project-access";
import { hasWorkspacePermission } from "../../utils/require-workspace-permission";
import { validateWorkspaceAccess } from "../../utils/validate-workspace-access";

// Same rules as POST /time-entry. The timer can record time on a task the
// access middleware did not check, like the one it just moved away from.
export async function canLogTime(c: Context, taskId: string) {
  const [task] = await db
    .select({
      projectId: projectTable.id,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);
  if (!task) return false;
  const userId = c.get("userId");
  try {
    await validateWorkspaceAccess(
      userId,
      task.workspaceId,
      c.get("apiKey")?.id,
    );
    await assertProjectAccess(userId, task.projectId);
  } catch {
    return false;
  }
  return hasWorkspacePermission(c, { task: ["update"] }, task.workspaceId);
}
