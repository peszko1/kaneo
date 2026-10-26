import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

beforeEach(resetTestDatabase);

describe("assigned tasks in board order", () => {
  it("follows the caller's global board, in progress first", async () => {
    const member = await createWorkspaceMember();
    const web = await createProjectFixture({
      workspaceId: member.workspace.id,
      slug: "web",
    });
    const api = await createProjectFixture({
      workspaceId: member.workspace.id,
      slug: "api",
    });

    const base = { priority: "medium", userId: member.user.id };
    const [soonTodo, laterTodo, active, planned] = await db
      .insert(schema.taskTable)
      .values([
        {
          ...base,
          projectId: web.project.id,
          title: "Due soon",
          status: "to-do",
          columnId: web.columns.todo.id,
          position: 1,
          number: 1,
          dueDate: new Date("2030-01-01T00:00:00.000Z"),
        },
        {
          ...base,
          projectId: api.project.id,
          title: "Due later, dragged to the top",
          status: "to-do",
          columnId: api.columns.todo.id,
          position: 1,
          number: 1,
          dueDate: new Date("2030-02-01T00:00:00.000Z"),
        },
        {
          ...base,
          projectId: web.project.id,
          title: "In progress",
          status: "in-progress",
          columnId: web.columns.inProgress.id,
          position: 1,
          number: 2,
        },
        {
          ...base,
          projectId: web.project.id,
          title: "Planned",
          status: "planned",
          position: 1,
          number: 3,
          dueDate: new Date("2029-01-01T00:00:00.000Z"),
        },
      ])
      .returning();
    await db.insert(schema.globalBoardOrderTable).values([
      { userId: member.user.id, taskId: laterTodo.id, position: 1 },
      { userId: member.user.id, taskId: soonTodo.id, position: 2 },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const titles = async (query: string) => {
      const response = await app.request(
        `/api/task/assigned?workspaceId=${member.workspace.id}${query}`,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        tasks: Array<{ title: string }>;
      };
      return body.tasks.map((task) => task.title);
    };

    expect(await titles("&order=board")).toEqual([
      active.title,
      laterTodo.title,
      soonTodo.title,
      planned.title,
    ]);
    expect(await titles("")).toEqual([
      planned.title,
      soonTodo.title,
      laterTodo.title,
      active.title,
    ]);
  });

  it("rejects an unknown order", async () => {
    const member = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const response = await createApp().app.request(
      `/api/task/assigned?workspaceId=${member.workspace.id}&order=random`,
    );
    expect(response.status).toBe(400);
  });
});
