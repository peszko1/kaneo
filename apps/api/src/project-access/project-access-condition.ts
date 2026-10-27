import { type SQLWrapper, sql } from "drizzle-orm";

export function projectAccessCondition(
  userId: string | SQLWrapper,
  projectId: string | SQLWrapper,
) {
  // A private inbox is visible to its owner alone, whatever their role. The
  // outer parentheses keep a caller's NOT applying to the whole condition.
  return sql<boolean>`((
    NOT EXISTS (
      SELECT 1 FROM project AS inbox_project
      WHERE inbox_project.id = ${projectId}
        AND inbox_project.inbox_owner_id IS NOT NULL
        AND inbox_project.inbox_owner_id <> ${userId}
    )
  ) AND (
    EXISTS (
      SELECT 1 FROM "user" AS access_user
      WHERE access_user.id = ${userId}
        AND 'admin' = ANY(string_to_array(access_user.role, ','))
    )
    OR NOT EXISTS (
      SELECT 1 FROM project AS access_project
      JOIN workspace_member_access AS access_rule
        ON access_rule.workspace_id = access_project.workspace_id
        AND access_rule.user_id = ${userId}
      WHERE access_project.id = ${projectId}
        AND access_rule.project_access <> 'all'
        AND NOT EXISTS (
          SELECT 1 FROM workspace_member AS access_member
          WHERE access_member.workspace_id = access_project.workspace_id
            AND access_member.user_id = ${userId}
            AND 'owner' = ANY(string_to_array(access_member.role, ','))
        )
        AND NOT EXISTS (
          SELECT 1 FROM workspace_member_project AS access_grant
          WHERE access_grant.workspace_id = access_project.workspace_id
            AND access_grant.user_id = ${userId}
            AND access_grant.project_id = access_project.id
        )
    )
  ))`;
}
