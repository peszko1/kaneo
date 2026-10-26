import { describe, expect, it } from "vite-plus/test";
import { buildTwoFactorPath, needsTwoFactor } from "./two-factor-path";

describe("needsTwoFactor", () => {
  it("is true only for the two-factor response", () => {
    expect(needsTwoFactor({ twoFactorRedirect: true })).toBe(true);
    expect(needsTwoFactor({ token: "abc", user: {} })).toBe(false);
    expect(needsTwoFactor(null)).toBe(false);
  });
});

describe("buildTwoFactorPath", () => {
  it("keeps where to go after the code", () => {
    expect(buildTwoFactorPath("/invitation/accept/i1")).toBe(
      "/auth/two-factor?redirect=%2Finvitation%2Faccept%2Fi1",
    );
    expect(buildTwoFactorPath(undefined)).toBe("/auth/two-factor");
  });
});
