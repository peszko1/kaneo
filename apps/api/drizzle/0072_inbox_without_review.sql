-- A private inbox has no review step: move its In Review tasks to In Progress
-- and drop the column, so the global board does not ask which one to use.
UPDATE "task" SET
  "status" = 'in-progress',
  "column_id" = (
    SELECT "c"."id" FROM "column" "c"
    WHERE "c"."project_id" = "task"."project_id" AND "c"."slug" = 'in-progress'
    LIMIT 1
  )
WHERE "task"."status" = 'in-review'
  AND "task"."project_id" IN (SELECT "id" FROM "project" WHERE "inbox_owner_id" IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM "column" "c"
    WHERE "c"."project_id" = "task"."project_id" AND "c"."slug" = 'in-progress'
  );--> statement-breakpoint
DELETE FROM "column"
WHERE "slug" = 'in-review'
  AND "project_id" IN (SELECT "id" FROM "project" WHERE "inbox_owner_id" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "task" "t"
    WHERE "t"."project_id" = "column"."project_id" AND "t"."status" = 'in-review'
  );--> statement-breakpoint
UPDATE "column" SET "position" = 2
WHERE "slug" = 'done' AND "position" = 3
  AND "project_id" IN (SELECT "id" FROM "project" WHERE "inbox_owner_id" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "column" "c"
    WHERE "c"."project_id" = "column"."project_id" AND "c"."slug" = 'in-review'
  );
