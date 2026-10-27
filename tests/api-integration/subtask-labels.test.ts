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

async function setup() {
  const member = await createWorkspaceMember();
  const fixture = await createProjectFixture({
    workspaceId: member.workspace.id,
  });
  const addTask = async (title: string, number: number) => {
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: fixture.project.id,
        title,
        number,
        status: fixture.columns.todo.slug,
        columnId: fixture.columns.todo.id,
      })
      .returning();
    if (!task) throw new Error("task not created");
    return task;
  };
  const parent = await addTask("Parent", 1);
  const plain = await addTask("Plain child", 4);
  const child = await addTask("Child", 2);
  const other = await addTask("Other", 3);
  await db.insert(schema.labelTable).values([
    {
      name: "Focus",
      color: "red",
      taskId: parent.id,
      workspaceId: member.workspace.id,
    },
    {
      name: "Ops",
      color: "blue",
      taskId: parent.id,
      workspaceId: member.workspace.id,
    },
    {
      name: "Ops",
      color: "green",
      taskId: child.id,
      workspaceId: member.workspace.id,
    },
  ]);
  mockAuthenticatedSession(member.user);
  return { ...member, parent, child, other, plain, app: createApp().app };
}

const linkSubtask = (
  app: ReturnType<typeof createApp>["app"],
  sourceTaskId: string,
  targetTaskId: string,
  relationType = "subtask",
) =>
  app.request("/api/task-relation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceTaskId, targetTaskId, relationType }),
  });

const labelsOf = async (taskId: string) =>
  (
    await db
      .select({ name: schema.labelTable.name, color: schema.labelTable.color })
      .from(schema.labelTable)
      .where(eq(schema.labelTable.taskId, taskId))
  ).sort((a, b) => a.name.localeCompare(b.name));

describe("API integration: subtask labels", () => {
  beforeEach(resetTestDatabase);

  it("copies the parent's labels onto a new subtask, keeping its own", async () => {
    const { app, parent, child } = await setup();
    expect((await linkSubtask(app, parent.id, child.id)).status).toBe(200);
    expect(await labelsOf(child.id)).toEqual([
      { name: "Focus", color: "red" },
      { name: "Ops", color: "green" },
    ]);
  });

  it("copies nothing for a non-subtask relation", async () => {
    const { app, parent, other } = await setup();
    expect((await linkSubtask(app, parent.id, other.id, "blocks")).status).toBe(
      200,
    );
    expect(await labelsOf(other.id)).toEqual([]);
  });

  it("lists a subtask under its parent's label on the global board", async () => {
    const { app, parent, child, other, plain } = await setup();
    await db.insert(schema.taskRelationTable).values([
      {
        sourceTaskId: parent.id,
        targetTaskId: plain.id,
        relationType: "subtask",
      },
      {
        sourceTaskId: parent.id,
        targetTaskId: other.id,
        relationType: "blocks",
      },
    ]);
    const response = await app.request(
      "/api/task/global-board?globalStatus=to-do&label=focus",
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { tasks: { id: string }[] };
    expect(body.tasks.map((task) => task.id).sort()).toEqual(
      [parent.id, plain.id].sort(),
    );

    const negated = await app.request(
      "/api/task/global-board?globalStatus=to-do&label=focus&negate=label",
    );
    const negatedBody = (await negated.json()) as { tasks: { id: string }[] };
    expect(negatedBody.tasks.map((task) => task.id).sort()).toEqual(
      [child.id, other.id].sort(),
    );
  });
});
