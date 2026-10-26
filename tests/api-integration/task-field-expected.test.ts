import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

async function createTaskFixture() {
  // An admin, since a plain member may not assign tasks.
  const member = await createWorkspaceMember({ role: "admin" });
  const { project, columns } = await createProjectFixture({
    workspaceId: member.workspace.id,
  });
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.id,
      title: "Server title",
      status: "to-do",
      columnId: columns.todo.id,
      priority: "medium",
      dueDate: new Date("2026-11-02T00:00:00.000Z"),
      number: 1,
      position: 1,
    })
    .returning();
  mockAuthenticatedSession(member.user);
  return { member, task };
}

const put = (path: string, body: object) =>
  createApp().app.request(`/api/task/${path}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const stored = (id: string) =>
  db.query.taskTable.findFirst({ where: eq(schema.taskTable.id, id) });

describe("API integration: offline edits send the value they last saw", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("applies an edit whose expected value is still current", async () => {
    const { task } = await createTaskFixture();

    const response = await put(`title/${task.id}`, {
      title: "Mine",
      expected: "Server title",
    });

    expect(response.status).toBe(200);
    expect((await stored(task.id))?.title).toBe("Mine");
  });

  it("answers 409 and keeps the newer value when someone else changed it", async () => {
    const { member, task } = await createTaskFixture();

    const responses = await Promise.all([
      put(`title/${task.id}`, { title: "Mine", expected: "Old title" }),
      put(`status/${task.id}`, { status: "done", expected: "in-progress" }),
      put(`priority/${task.id}`, { priority: "high", expected: "low" }),
      put(`assignee/${task.id}`, {
        userId: member.user.id,
        expected: "someone",
      }),
      put(`due-date/${task.id}`, {
        dueDate: "2026-12-01T00:00:00.000Z",
        expected: null,
      }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      409, 409, 409, 409, 409,
    ]);
    expect(await stored(task.id)).toMatchObject({
      title: "Server title",
      status: "to-do",
      priority: "medium",
      userId: null,
      dueDate: new Date("2026-11-02T00:00:00.000Z"),
    });
  });

  it("accepts a repeat of an edit that already went through", async () => {
    const { task } = await createTaskFixture();
    await put(`priority/${task.id}`, { priority: "high", expected: "medium" });

    const repeat = await put(`priority/${task.id}`, {
      priority: "high",
      expected: "medium",
    });

    expect(repeat.status).toBe(200);
  });

  it("compares dates by time", async () => {
    const { task } = await createTaskFixture();

    const response = await put(`due-date/${task.id}`, {
      dueDate: "2026-12-01T00:00:00.000Z",
      expected: "2026-11-02T00:00:00Z",
    });

    expect(response.status).toBe(200);
  });

  it("always applies an edit without an expected value", async () => {
    const { task } = await createTaskFixture();

    const response = await put(`title/${task.id}`, { title: "Online edit" });

    expect(response.status).toBe(200);
    expect((await stored(task.id))?.title).toBe("Online edit");
  });
});
