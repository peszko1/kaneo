import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { expectedValue } from "./expected-value";

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient();
  queryClient.setQueryData(["tasks", "p1"], {
    id: "p1",
    columns: [
      {
        slug: "to-do",
        tasks: [{ id: "t1", title: "Board title", assigneeId: "u1" }],
      },
    ],
    plannedTasks: [],
    archivedTasks: [],
  });
});

const title = (value: string) => ({
  kind: "title" as const,
  taskId: "t1",
  projectId: "p1",
  title: value,
});

describe("expectedValue", () => {
  it("reads the open task first", () => {
    queryClient.setQueryData(["task", "t1"], { id: "t1", title: "Open" });
    expect(expectedValue(queryClient, title("New"))).toBe("Open");
  });

  it("falls back to the board, where the assignee is assigneeId", () => {
    expect(expectedValue(queryClient, title("New"))).toBe("Board title");
    expect(
      expectedValue(queryClient, {
        kind: "assignee",
        taskId: "t1",
        projectId: "p1",
        userId: "u2",
      }),
    ).toBe("u1");
  });

  it("checks nothing when the screen already shows the new value", () => {
    expect(expectedValue(queryClient, title("Board title"))).toBeUndefined();
  });

  it("checks nothing for a task this device has not loaded", () => {
    expect(
      expectedValue(queryClient, { ...title("New"), taskId: "other" }),
    ).toBeUndefined();
  });
});
