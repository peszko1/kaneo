import { describe, expect, it } from "vite-plus/test";
import type { BoardMeta } from "../api/types";
import { parseQuery } from "./parse-query";
import { localWeekStart, toBoardParams } from "./to-board-params";

const meta = {
  workspaces: [],
  projects: [
    { id: "p1", slug: "KAN", name: "Kaneo" },
    { id: "p2", slug: "kan", name: "Other workspace" },
    { id: "p3", slug: "OPS", name: "Ops" },
  ],
  assignees: [{ id: "u1", name: "Ada Lovelace", image: null }],
  labels: [],
} as unknown as BoardMeta;

function query(raw: Record<string, unknown>) {
  const result = parseQuery(raw, { filename: "note" });
  if (!result.ok) throw new Error(result.error);
  return result.query;
}

describe("toBoardParams", () => {
  it("sends one request per status", () => {
    const result = toBoardParams(query({ status: ["to-do", "done"] }), meta);
    expect(result.ok && result.params.map((p) => p.globalStatus)).toEqual([
      "to-do",
      "done",
    ]);
  });

  it("resolves project keys in every workspace, ignoring case", () => {
    const result = toBoardParams(query({ project: "kan" }), meta);
    expect(result.ok && result.params[0]?.projectId).toEqual(["p1", "p2"]);
  });

  it("reports an unknown project key", () => {
    expect(toBoardParams(query({ project: "NOPE" }), meta)).toEqual({
      ok: false,
      error: 'No project with the key "NOPE" is visible to you.',
    });
  });

  it("maps assignee names to IDs and keeps me and unassigned", () => {
    const result = toBoardParams(
      query({ assignee: ["me", "ada lovelace", "unassigned"] }),
      meta,
    );
    expect(result.ok && result.params[0]?.assigneeId).toEqual([
      "me",
      "u1",
      "unassigned",
    ]);
  });

  it("leaves unused filters out", () => {
    const result = toBoardParams(query({}), meta);
    expect(result.ok && result.params[0]).toEqual({
      globalStatus: "to-do",
      projectId: undefined,
      assigneeId: undefined,
      priority: undefined,
      label: undefined,
      dueDate: undefined,
      dueWeekStart: undefined,
      q: undefined,
      page: "1",
      limit: "100",
    });
  });
});

describe("localWeekStart", () => {
  it("returns the previous Monday at local midnight", () => {
    const start = new Date(localWeekStart(new Date(2026, 9, 24, 15, 30)));
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(19);
    expect(start.getHours()).toBe(0);
  });

  it("keeps Monday itself", () => {
    const start = new Date(localWeekStart(new Date(2026, 9, 19, 0, 5)));
    expect(start.getDate()).toBe(19);
  });
});
