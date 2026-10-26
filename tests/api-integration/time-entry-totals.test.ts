import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

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

async function seed() {
  const ctx = await createRestrictedWorkspace();
  const { restricted, owner, alphaTask, betaTask } = ctx;
  await logEntry(alphaTask.id, restricted.id, at("09:00"), at("09:25"));
  await logEntry(alphaTask.id, owner.id, at("10:00"), at("10:50"));
  // A running timer and a hidden project do not count.
  await logEntry(alphaTask.id, restricted.id, at("11:00"), null);
  await logEntry(betaTask.id, owner.id, at("12:00"), at("12:30"));
  return ctx;
}

beforeEach(resetTestDatabase);

describe("project time totals", () => {
  it("totals every member's finished time on visible projects", async () => {
    const ctx = await seed();

    mockAuthenticatedSession(ctx.restricted);
    const response = await projectAccessApi()(
      `/time-entry/project-totals?workspaceId=${ctx.workspace.id}`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      projects: [{ projectId: ctx.alpha.id, totalSeconds: 75 * 60 }],
    });
  });

  it("includes every project for the owner", async () => {
    const ctx = await seed();

    mockAuthenticatedSession(ctx.owner);
    const response = await projectAccessApi()(
      `/time-entry/project-totals?workspaceId=${ctx.workspace.id}`,
    );
    const body = (await response.json()) as {
      projects: Array<{ projectId: string; totalSeconds: number }>;
    };

    expect(
      body.projects.sort((a, b) => a.projectId.localeCompare(b.projectId)),
    ).toEqual(
      [
        { projectId: ctx.alpha.id, totalSeconds: 75 * 60 },
        { projectId: ctx.beta.id, totalSeconds: 30 * 60 },
      ].sort((a, b) => a.projectId.localeCompare(b.projectId)),
    );
  });

  it("hides a workspace the caller is not a member of", async () => {
    const ctx = await createRestrictedWorkspace();
    const other = await createWorkspaceMember({ role: "owner" });

    mockAuthenticatedSession(ctx.restricted);
    const response = await projectAccessApi()(
      `/time-entry/project-totals?workspaceId=${other.workspace.id}`,
    );

    expect(response.status).toBe(404);
  });
});

describe("assigned task time", () => {
  it("returns every member's finished time on each task", async () => {
    const ctx = await seed();

    mockAuthenticatedSession(ctx.restricted);
    const response = await projectAccessApi()(
      `/task/assigned?workspaceId=${ctx.workspace.id}`,
    );
    const body = (await response.json()) as {
      tasks: Array<{ id: string; trackedSeconds: number }>;
    };

    expect(response.status).toBe(200);
    expect(body.tasks).toEqual([
      expect.objectContaining({
        id: ctx.alphaTask.id,
        trackedSeconds: 75 * 60,
      }),
    ]);
  });
});
