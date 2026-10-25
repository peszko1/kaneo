import { describe, expect, it } from "vite-plus/test";
import type { BoardColumn } from "../api/types";
import { isFinalStatus, targetColumn } from "./target-column";

const column = (
  slug: string,
  position: number,
  isFinal = false,
  globalStatus: BoardColumn["globalStatus"] = null,
) => ({ slug, position, isFinal, globalStatus }) as BoardColumn;

const columns = [
  column("archive", 4, true, "done"),
  column("done", 3, true, "done"),
  column("doing", 2, false, "in-progress"),
  column("to-do", 1, false, "to-do"),
  column("triage", 0, false, null),
];

describe("targetColumn", () => {
  it("moves a checked task to the first final column", () => {
    expect(targetColumn(columns, true)).toBe("done");
  });

  it("moves an unchecked task to the first to-do column", () => {
    expect(targetColumn(columns, false)).toBe("to-do");
  });

  it("falls back to the first open column", () => {
    expect(
      targetColumn([column("doing", 1, false, "in-progress")], false),
    ).toBe("doing");
  });

  it("returns null when the project has no final column", () => {
    expect(targetColumn([column("to-do", 0)], true)).toBeNull();
  });
});

describe("isFinalStatus", () => {
  it("checks the column flag", () => {
    expect(isFinalStatus(columns, "archive")).toBe(true);
    expect(isFinalStatus(columns, "doing")).toBe(false);
    expect(isFinalStatus(columns, "gone")).toBe(false);
  });
});
