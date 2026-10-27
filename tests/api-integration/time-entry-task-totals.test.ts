import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

const from = "2026-01-01T00:00:00.000Z";
const to = "2026-01-02T00:00:00.000Z";
const at = (time: string) => new Date(`2026-01-01T${time}:00.000Z`);

async function logEntry(
  taskId: string,
  userId: string,
  start: Date,
  end: Date | null,
) {
  await db.insert(schema.timeEntryTable).values({
    taskId,
    userId,
    startTime: start,
    endTime: end,
    duration: end ? (end.getTime() - start.getTime()) / 1000 : null,
  });
}

beforeEach(resetTestDatabase);

describe("time per task", () => {
  it("totals the caller's finished time per visible task, most first", async () => {
    const ctx = await createRestrictedWorkspace();
    const { restricted, owner, alphaTask, betaTask } = ctx;
    const [second] = await db
      .insert(schema.taskTable)
      .values({
        projectId: ctx.alpha.id,
        title: "Second alpha task",
        status: alphaTask.status,
        columnId: alphaTask.columnId,
        number: 2,
      })
      .returning();

    await logEntry(alphaTask.id, restricted.id, at("09:00"), at("09:25"));
    await logEntry(second.id, restricted.id, at("10:00"), at("10:50"));
    await logEntry(alphaTask.id, restricted.id, at("11:00"), at("11:10"));
    // Hidden project, someone else's time, a running timer, another day.
    await logEntry(betaTask.id, restricted.id, at("12:00"), at("12:25"));
    await logEntry(alphaTask.id, owner.id, at("13:00"), at("13:25"));
    await logEntry(alphaTask.id, restricted.id, at("14:00"), null);
    await logEntry(
      alphaTask.id,
      restricted.id,
      new Date("2026-01-02T09:00:00.000Z"),
      new Date("2026-01-02T09:25:00.000Z"),
    );

    mockAuthenticatedSession(restricted);
    const response = await projectAccessApi()(
      `/time-entry/task-totals?workspaceId=${ctx.workspace.id}&from=${from}&to=${to}`,
    );

    expect(response.status).toBe(200);
    const project = {
      projectId: ctx.alpha.id,
      projectName: "Alpha",
      projectSlug: "alpha",
      projectIcon: ctx.alpha.icon,
    };
    expect(await response.json()).toEqual({
      tasks: [
        {
          taskId: second.id,
          taskNumber: 2,
          taskTitle: "Second alpha task",
          ...project,
          totalSeconds: 50 * 60,
        },
        {
          taskId: alphaTask.id,
          taskNumber: 1,
          taskTitle: "Visible alpha task",
          ...project,
          totalSeconds: 35 * 60,
        },
      ],
    });
  });

  it("hides a workspace the caller is not a member of", async () => {
    const ctx = await createRestrictedWorkspace();
    const other = await createWorkspaceMember({ role: "owner" });

    mockAuthenticatedSession(ctx.restricted);
    const response = await projectAccessApi()(
      `/time-entry/task-totals?workspaceId=${other.workspace.id}&from=${from}&to=${to}`,
    );

    expect(response.status).toBe(404);
  });
});
