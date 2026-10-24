import { describe, expect, it } from "vite-plus/test";
import { parseQuery } from "./parse-query";

const context = { filename: "KAN-12 notes" };

describe("parseQuery", () => {
  it("fills defaults for an empty block", () => {
    expect(parseQuery(null, context)).toEqual({
      ok: true,
      query: {
        name: undefined,
        assignee: [],
        project: [],
        priority: [],
        label: [],
        due: [],
        status: ["to-do", "in-progress"],
        q: undefined,
        groupBy: undefined,
        sort: [],
        show: ["ticket", "due", "project"],
        autorefresh: undefined,
      },
    });
  });

  it("accepts single values and lists", () => {
    const result = parseQuery(
      {
        name: "This week",
        assignee: "me",
        project: ["KAN", "OPS"],
        priority: ["high", "urgent"],
        label: "backend",
        due: "dueThisWeek",
        status: "done",
        groupBy: "project",
        sort: ["due", "priority"],
        show: ["ticket", "labels"],
        autorefresh: 120,
      },
      context,
    );
    expect(result).toMatchObject({
      ok: true,
      query: {
        name: "This week",
        assignee: ["me"],
        project: ["KAN", "OPS"],
        priority: ["high", "urgent"],
        label: ["backend"],
        due: ["dueThisWeek"],
        status: ["done"],
        groupBy: "project",
        sort: ["due", "priority"],
        show: ["ticket", "labels"],
        autorefresh: 120,
      },
    });
  });

  it("replaces {{filename}} with the note name", () => {
    const result = parseQuery({ q: "{{filename}}" }, context);
    expect(result.ok && result.query.q).toBe("KAN-12 notes");
  });

  it("rejects unknown options and values", () => {
    expect(parseQuery({ colour: "red" }, context)).toEqual({
      ok: false,
      error: "Unknown option `colour`.",
    });
    expect(parseQuery({ priority: "huge" }, context)).toMatchObject({
      ok: false,
      error: expect.stringContaining('`priority` cannot be "huge"'),
    });
    expect(parseQuery({ autorefresh: "soon" }, context)).toMatchObject({
      ok: false,
    });
    expect(parseQuery(["me"], context)).toMatchObject({ ok: false });
  });
});
