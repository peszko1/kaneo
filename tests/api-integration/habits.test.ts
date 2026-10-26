import { beforeEach, describe, expect, it } from "vite-plus/test";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";

type User = Awaited<ReturnType<typeof createWorkspaceMember>>["user"];
type Habit = { id: string; name: string; doneCount: number; checks: string[] };

function client(user: User) {
  mockAuthenticatedSession(user);
  const { app } = createApp();
  const send = (path: string, method: string, body?: unknown) =>
    app.request(`/api/habit${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return {
    send,
    list: async (from = "2026-10-01", to = "2026-10-31") => {
      const response = await app.request(`/api/habit?from=${from}&to=${to}`);
      expect(response.status).toBe(200);
      return (await response.json()) as Habit[];
    },
  };
}

describe("API integration: habits", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("tracks the caller's habits day by day", async () => {
    const me = await createWorkspaceMember();
    const api = client(me.user);

    const created = await api.send("", "POST", { name: " Śpiew " });
    expect(created.status).toBe(200);
    const habit = (await created.json()) as Habit;
    expect(habit).toMatchObject({ name: "Śpiew", doneCount: 0, checks: [] });

    for (const date of ["2026-09-30", "2026-10-02", "2026-10-03"])
      expect((await api.send(`/${habit.id}/check/${date}`, "PUT")).status).toBe(
        200,
      );
    // Checking twice is harmless.
    await api.send(`/${habit.id}/check/2026-10-03`, "PUT");
    expect(await api.list()).toMatchObject([
      { name: "Śpiew", doneCount: 3, checks: ["2026-10-02", "2026-10-03"] },
    ]);

    await api.send(`/${habit.id}/check/2026-10-02`, "DELETE");
    await api.send(`/${habit.id}`, "PUT", { name: "Gimnastyka" });
    expect(await api.list()).toMatchObject([
      { name: "Gimnastyka", doneCount: 2, checks: ["2026-10-03"] },
    ]);

    expect((await api.send(`/${habit.id}`, "DELETE")).status).toBe(200);
    expect(await api.list()).toEqual([]);
  });

  it("keeps habits private and validates input", async () => {
    const me = await createWorkspaceMember();
    const other = await createWorkspaceMember();
    const habit = (await (
      await client(me.user).send("", "POST", { name: "Ćwiczenia" })
    ).json()) as Habit;

    const theirs = client(other.user);
    expect(await theirs.list()).toEqual([]);
    expect(
      (await theirs.send(`/${habit.id}/check/2026-10-01`, "PUT")).status,
    ).toBe(404);
    expect((await theirs.send(`/${habit.id}`, "DELETE")).status).toBe(404);

    const mine = client(me.user);
    expect((await mine.send("", "POST", { name: "  " })).status).toBe(400);
    expect(
      (await mine.send(`/${habit.id}/check/2026-13-01`, "PUT")).status,
    ).toBe(400);
    const { app } = createApp();
    expect(
      (await app.request("/api/habit?from=2026-10-31&to=2026-10-01")).status,
    ).toBe(400);
  });

  it("keeps the order the caller sets", async () => {
    const me = await createWorkspaceMember();
    const other = await createWorkspaceMember();
    const api = client(me.user);
    const create = async (name: string) =>
      (await (await api.send("", "POST", { name })).json()) as Habit;
    const a = await create("A");
    const b = await create("B");
    const c = await create("C");
    const names = async () => (await api.list()).map((habit) => habit.name);
    expect(await names()).toEqual(["A", "B", "C"]);

    expect(
      (await api.send("/order", "PUT", { ids: [c.id, a.id, b.id] })).status,
    ).toBe(200);
    expect(await names()).toEqual(["C", "A", "B"]);
    await create("D");
    expect(await names()).toEqual(["C", "A", "B", "D"]);

    // The order must name each of the caller's habits exactly once.
    const theirs = (await (
      await client(other.user).send("", "POST", { name: "X" })
    ).json()) as Habit;
    const mine = client(me.user);
    for (const ids of [
      [a.id, b.id],
      [a.id, a.id, b.id, c.id],
      [a.id, b.id, c.id, theirs.id],
    ])
      expect((await mine.send("/order", "PUT", { ids })).status).toBe(400);
    expect(await names()).toEqual(["C", "A", "B", "D"]);
  });
});
