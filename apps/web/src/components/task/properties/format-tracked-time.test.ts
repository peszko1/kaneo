import { describe, expect, it } from "vite-plus/test";
import { formatTrackedTime } from "./format-tracked-time";

describe("formatTrackedTime", () => {
  it("shows hours and minutes, dropping seconds", () => {
    expect(formatTrackedTime(59)).toBe("0m");
    expect(formatTrackedTime(25 * 60 + 30)).toBe("25m");
    expect(formatTrackedTime(2 * 3600)).toBe("2h");
    expect(formatTrackedTime(2 * 3600 + 5 * 60)).toBe("2h 5m");
  });
});
