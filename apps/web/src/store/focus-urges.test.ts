import { beforeEach, describe, expect, it } from "vite-plus/test";
import { useFocusUrgesStore } from "./focus-urges";

describe("focus urges", () => {
  beforeEach(() => {
    localStorage.clear();
    useFocusUrgesStore.setState({ resisted: 0 });
  });

  it("counts each resisted urge and keeps the count", () => {
    useFocusUrgesStore.getState().resist();
    useFocusUrgesStore.getState().resist();

    expect(useFocusUrgesStore.getState().resisted).toBe(2);
    expect(JSON.parse(localStorage.getItem("focus-urges") ?? "{}")).toEqual({
      state: { resisted: 2 },
      version: 0,
    });
  });
});
