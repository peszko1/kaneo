CREATE TABLE "focus_session" (
	"user_id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"mode" text NOT NULL,
	"phase" text NOT NULL,
	"completed_focus_rounds" integer NOT NULL,
	"duration_ms" bigint,
	"elapsed_ms" bigint NOT NULL,
	"running_since" bigint,
	"alarm_at" bigint,
	"version" integer NOT NULL,
	"updated_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "focus_session" ADD CONSTRAINT "focus_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "focus_session" ADD CONSTRAINT "focus_session_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade;