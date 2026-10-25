import { describe, expect, it } from "vite-plus/test";
import type { BoardTask } from "../api/types";
import { arrangeTasks, sortTasks } from "./arrange-tasks";

const task = (overrides: Partial<BoardTask>) =>
  ({
    id: "t",
    title: "Task",
    status: "to-do",
    statusName: "To Do",
    priority: "no-priority",
    dueDate: null,
    projectName: "Kaneo",
    labels: [],
    ...overrides,
  }) as BoardTask;

const ids = (tasks: BoardTask[]) => tasks.map((t) => t.id);

describe("sortTasks", () => {
  it("puts undated tasks last when sorting by due date", () => {
    const tasks = [
      task({ id: "none" }),
      task({ id: "late", dueDate: "2026-11-02T00:00:00.000Z" }),
      task({ id: "soon", dueDate: "2026-10-25T00:00:00.000Z" }),
    ];
    expect(ids(sortTasks(tasks, ["due"]))).toEqual(["soon", "late", "none"]);
  });

  it("uses later keys to break ties", () => {
    const tasks = [
      task({ id: "low", priority: "low" }),
      task({ id: "urgent", priority: "urgent" }),
      task({ id: "urgent-b", priority: "urgent", title: "B" }),
      task({ id: "urgent-a", priority: "urgent", title: "A" }),
    ];
    expect(ids(sortTasks(tasks, ["priority", "title"]))).toEqual([
      "urgent-a",
      "urgent-b",
      "urgent",
      "low",
    ]);
  });

  it("keeps the API order without sort keys", () => {
    const tasks = [task({ id: "b" }), task({ id: "a" })];
    expect(ids(sortTasks(tasks, []))).toEqual(["b", "a"]);
  });
});

describe("arrangeTasks", () => {
  it("returns one untitled group without groupBy", () => {
    const tasks = [task({ id: "a" })];
    expect(arrangeTasks(tasks, undefined, [])).toEqual([
      { title: null, tasks },
    ]);
  });

  it("lists a task under each of its labels", () => {
    const tasks = [
      task({
        id: "both",
        labels: [{ name: "api" }, { name: "web" }] as BoardTask["labels"],
      }),
      task({ id: "bare" }),
    ];
    expect(
      arrangeTasks(tasks, "label", []).map((group) => [
        group.title,
        ids(group.tasks),
      ]),
    ).toEqual([
      ["api", ["both"]],
      ["web", ["both"]],
      ["No label", ["bare"]],
    ]);
  });

  it("groups by status name", () => {
    const tasks = [
      task({ id: "a", statusName: "Doing" }),
      task({ id: "b", statusName: null, status: "custom" }),
    ];
    expect(arrangeTasks(tasks, "status", []).map((g) => g.title)).toEqual([
      "Doing",
      "custom",
    ]);
  });
});
