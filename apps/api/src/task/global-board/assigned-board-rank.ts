import { and, eq, inArray, notInArray } from "drizzle-orm";
import { taskTable } from "../../database/schema";
import type { PermissionMap } from "../../utils/role-permissions";
import { VIRTUAL_STATUSES } from "../validate-task-fields";
import { loadBoardScope } from "./board-scope";
import { inColumns, laneOrder } from "./lane-order";

// Open work comes from these lanes; in progress leads because it is underway.
const LANES = ["in-progress", "to-do"] as const;

/**
 * Where each of the caller's tasks sits on their global board, filtered to
 * their own tasks in one workspace: in-progress cards first, then to-do,
 * each lane top to bottom. Tasks off the board have no rank.
 */
export async function getAssignedBoardRank(
  workspaceId: string,
  userId: string,
  apiKeyScope: PermissionMap | null,
  limit: number,
) {
  const scope = await loadBoardScope(userId, apiKeyScope, { workspaceId });
  const rank = new Map<string, number>();
  if (scope.projects.length === 0) return rank;

  const lanes = await Promise.all(
    LANES.map((lane) =>
      scope.columnIds[lane].length
        ? laneOrder(
            and(
              inArray(
                taskTable.projectId,
                scope.projects.map((project) => project.id),
              ),
              notInArray(taskTable.status, [...VIRTUAL_STATUSES]),
              inColumns(scope.columnIds[lane]),
              eq(taskTable.userId, userId),
            ),
            userId,
            limit,
            0,
          )
        : [],
    ),
  );
  for (const id of lanes.flat()) rank.set(id, rank.size);
  return rank;
}
