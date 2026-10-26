import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

const minute = 60_000;

function focusState(runningSince: number | null, elapsedMs = 0) {
  return {
    mode: "pomodoro",
    phase: "focus",
    completedFocusRounds: 0,
    durationMs: 25 * minute,
    elapsedMs,
    runningSince,
    alarmAt: null,
  };
}

const timeEntries = (taskId: string) =>
  db
    .select()
    .from(schema.timeEntryTable)
    .where(eq(schema.timeEntryTable.taskId, taskId));

beforeEach(resetTestDatabase);

describe("focus session", () => {
  async function started() {
    const ctx = await createRestrictedWorkspace();
    mockAuthenticatedSession(ctx.restricted);
    const api = projectAccessApi();
    const startedAt = Date.now() - 20 * minute;
    const response = await api("/focus/session", {
      method: "PUT",
      body: {
        taskId: ctx.alphaTask.id,
        baseVersion: null,
        at: startedAt,
        state: focusState(startedAt),
      },
    });
    expect(response.status).toBe(200);
    return { ...ctx, api, startedAt };
  }

  it("shares the timer and its task's project and workspace", async () => {
    const { api, alphaTask, alpha, workspace, startedAt } = await started();

    const response = await api("/focus/session");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: {
        ...focusState(startedAt),
        taskId: alphaTask.id,
        projectId: alpha.id,
        workspaceId: workspace.id,
        version: 1,
      },
      recordedTaskId: null,
    });
  });

  it("records the focus time a pause ends once, when two devices send it", async () => {
    const { api, alphaTask, startedAt } = await started();
    const pausedAt = startedAt + 10 * minute;
    const pause = {
      taskId: alphaTask.id,
      baseVersion: 1,
      at: pausedAt,
      state: focusState(null, 10 * minute),
    };

    const first = await api("/focus/session", { method: "PUT", body: pause });
    const second = await api("/focus/session", { method: "PUT", body: pause });

    expect(first.status).toBe(200);
    expect((await first.json()).recordedTaskId).toBe(alphaTask.id);
    expect(second.status).toBe(409);
    expect((await second.json()).session.version).toBe(2);
    const entries = await timeEntries(alphaTask.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.startTime.getTime()).toBe(startedAt);
    // The change happened offline earlier; the time ends at the change.
    expect(entries[0]?.endTime?.getTime()).toBe(pausedAt);
    expect(entries[0]?.duration).toBe(600);
  });

  it("records the running time and clears the timer on stop", async () => {
    const { api, alphaTask, startedAt } = await started();

    const response = await api("/focus/session/stop", {
      method: "POST",
      body: { baseVersion: 1, at: startedAt + 5 * minute },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: null,
      recordedTaskId: alphaTask.id,
    });
    expect(await timeEntries(alphaTask.id)).toHaveLength(1);
    expect((await (await api("/focus/session")).json()).session).toBeNull();
  });

  it("rejects a start when another device already started a timer", async () => {
    const { api, alphaTask, startedAt } = await started();

    const response = await api("/focus/session", {
      method: "PUT",
      body: {
        taskId: alphaTask.id,
        baseVersion: null,
        at: startedAt,
        state: focusState(startedAt),
      },
    });

    expect(response.status).toBe(409);
  });

  it("does not let the timer use a task in a hidden project", async () => {
    const { api, betaTask, startedAt } = await started();

    const response = await api("/focus/session", {
      method: "PUT",
      body: {
        taskId: betaTask.id,
        baseVersion: 1,
        at: startedAt,
        state: focusState(startedAt),
      },
    });

    expect(response.status).toBe(403);
  });

  it("records nothing on a task the caller lost access to", async () => {
    const { api, alphaTask, restricted, startedAt } = await started();
    await db
      .delete(schema.workspaceUserTable)
      .where(eq(schema.workspaceUserTable.userId, restricted.id));

    const response = await api("/focus/session/stop", {
      method: "POST",
      body: { baseVersion: 1, at: startedAt + 5 * minute },
    });

    expect(response.status).toBe(200);
    expect((await response.json()).recordedTaskId).toBeNull();
    expect(await timeEntries(alphaTask.id)).toHaveLength(0);
  });
});
