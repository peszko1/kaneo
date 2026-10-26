ALTER TABLE "habit" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Existing habits keep the oldest-first order they had.
UPDATE "habit" SET "position" = ranked.position
FROM (
	SELECT "id", row_number() OVER (PARTITION BY "user_id" ORDER BY "created_at", "id") - 1 AS position
	FROM "habit"
) AS ranked
WHERE "habit"."id" = ranked."id";
