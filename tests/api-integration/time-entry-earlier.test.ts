import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { hasEarlierTimeEntry } from "../../apps/api/src/time-entry/has-earlier-time-entry";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const now = new Date("2026-01-01T12:00:00.000Z");
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000);

async function seed() {
  const { user, workspace } = await createWorkspaceMember({ role: "owner" });
  const { project } = await createProjectFixture({ workspaceId: workspace.id });
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.id,
      title: "Focus task",
      description: "",
      priority: "low",
      status: "to-do",
      number: 1,
      position: 1,
    })
    .returning();
  if (!task) throw new Error("task not created");

  const addEntry = async (createdAt: Date) => {
    const [entry] = await db
      .insert(schema.timeEntryTable)
      .values({
        taskId: task.id,
        userId: user.id,
        startTime: createdAt,
        createdAt,
      })
      .returning();
    if (!entry) throw new Error("entry not created");
    return entry;
  };

  return { user, task, addEntry };
}

beforeEach(async () => {
  await resetTestDatabase();
});

describe("hasEarlierTimeEntry", () => {
  it("is false for the first entry and true for later ones within 12 hours", async () => {
    const { user, task, addEntry } = await seed();
    const first = await addEntry(hoursAgo(1));
    const args = { taskId: task.id, userId: user.id, now };

    expect(await hasEarlierTimeEntry({ ...args, timeEntryId: first.id })).toBe(
      false,
    );

    const second = await addEntry(now);
    expect(await hasEarlierTimeEntry({ ...args, timeEntryId: second.id })).toBe(
      true,
    );
  });

  it("ignores entries older than 12 hours", async () => {
    const { user, task, addEntry } = await seed();
    await addEntry(hoursAgo(13));
    const latest = await addEntry(now);

    expect(
      await hasEarlierTimeEntry({
        timeEntryId: latest.id,
        taskId: task.id,
        userId: user.id,
        now,
      }),
    ).toBe(false);
  });
});
