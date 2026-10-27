import { readFileSync } from "node:fs";
import { asc, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const migration = readFileSync(
  new URL(
    "../../apps/api/drizzle/0072_inbox_without_review.sql",
    import.meta.url,
  ),
  "utf8",
);

function columns(projectId: string) {
  return db
    .select({
      slug: schema.columnTable.slug,
      position: schema.columnTable.position,
    })
    .from(schema.columnTable)
    .where(eq(schema.columnTable.projectId, projectId))
    .orderBy(asc(schema.columnTable.position));
}

describe("inbox without review migration", () => {
  beforeEach(resetTestDatabase);

  it("moves inbox review tasks to In Progress and drops the column", async () => {
    const { user, workspace } = await createWorkspaceMember({ role: "owner" });
    const inbox = await createProjectFixture({ workspaceId: workspace.id });
    await db
      .update(schema.projectTable)
      .set({ inboxOwnerId: user.id })
      .where(eq(schema.projectTable.id, inbox.project.id));
    const other = await createProjectFixture({ workspaceId: workspace.id });
    const [inboxTask, otherTask] = await db
      .insert(schema.taskTable)
      .values([
        {
          projectId: inbox.project.id,
          title: "Inbox review",
          status: "in-review",
          columnId: inbox.columns.inReview.id,
        },
        {
          projectId: other.project.id,
          title: "Project review",
          status: "in-review",
          columnId: other.columns.inReview.id,
        },
      ])
      .returning();

    await db.execute(sql.raw(migration));
    await db.execute(sql.raw(migration));

    expect(await columns(inbox.project.id)).toEqual([
      { slug: "to-do", position: 0 },
      { slug: "in-progress", position: 1 },
      { slug: "done", position: 2 },
    ]);
    expect((await columns(other.project.id)).map((c) => c.slug)).toContain(
      "in-review",
    );
    const tasks = await db
      .select({
        id: schema.taskTable.id,
        status: schema.taskTable.status,
        columnId: schema.taskTable.columnId,
      })
      .from(schema.taskTable);
    expect(tasks.find((task) => task.id === inboxTask.id)).toMatchObject({
      status: "in-progress",
      columnId: inbox.columns.inProgress.id,
    });
    expect(tasks.find((task) => task.id === otherTask.id)).toMatchObject({
      status: "in-review",
      columnId: other.columns.inReview.id,
    });
  });
});
