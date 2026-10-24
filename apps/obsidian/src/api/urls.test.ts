import { describe, expect, it } from "vite-plus/test";
import { normalizeOrigin, resolveApiBase, taskUrl } from "./urls";

describe("normalizeOrigin", () => {
  it("adds https and strips a trailing /api and slashes", () => {
    expect(normalizeOrigin("kaneo.example.com/")).toBe(
      "https://kaneo.example.com",
    );
    expect(normalizeOrigin(" http://10.0.0.2:1337/api/ ")).toBe(
      "http://10.0.0.2:1337",
    );
  });

  it("keeps an empty value empty", () => {
    expect(normalizeOrigin("  ")).toBe("");
  });
});

describe("resolveApiBase", () => {
  it("uses the web address for bundled instances", () => {
    expect(resolveApiBase("https://kaneo.example.com", "")).toBe(
      "https://kaneo.example.com/api",
    );
  });

  it("prefers a separately hosted API address", () => {
    expect(
      resolveApiBase("https://kaneo.example.com", "api.example.com/api"),
    ).toBe("https://api.example.com/api");
  });

  it("returns nothing when no address is set", () => {
    expect(resolveApiBase("", "")).toBe("");
  });
});

describe("taskUrl", () => {
  it("links to the full task path", () => {
    expect(
      taskUrl("https://kaneo.example.com/", {
        id: "t1",
        projectId: "p1",
        workspaceId: "w1",
      }),
    ).toBe(
      "https://kaneo.example.com/dashboard/workspace/w1/project/p1/task/t1",
    );
  });
});
