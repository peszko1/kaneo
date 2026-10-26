import * as email from "@kaneo/email";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createApp } from "../../apps/api/src/index";
import { drainSignInEmails } from "../../apps/api/src/utils/sign-in-email-tasks";
import { resetTestDatabase } from "./helpers/database";
import { totpFromUri } from "./helpers/totp";

const address = "two-factor@example.com";
const password = "test-password-at-least-12";

// Each jar is one browser: it keeps the cookies the API sets.
function browser() {
  const cookies = new Map<string, string>();
  const post = async (path: string, body: unknown) => {
    const response = await createApp().app.request(`/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Origin: "http://localhost:5173",
        cookie: [...cookies]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
      },
      body: JSON.stringify(body),
    });
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(";");
      const [name, value = ""] = (pair ?? "").split("=");
      if (!name) continue;
      const expired = attributes.some((a) => /max-age=0/i.test(a.trim()));
      if (expired || value === "") cookies.delete(name.trim());
      else cookies.set(name.trim(), value);
    }
    await drainSignInEmails();
    return { status: response.status, body: await response.json() };
  };
  const has = (part: string) =>
    [...cookies.keys()].some((name) => name.includes(part));
  return { post, has, cookies };
}

async function userWithTwoFactor() {
  const device = browser();
  expect(
    (
      await device.post("/sign-up/email", {
        name: "Two Factor",
        email: address,
        password,
      })
    ).status,
  ).toBe(200);
  const enabled = await device.post("/two-factor/enable", { password });
  expect(enabled.status).toBe(200);
  const uri: string = enabled.body.totpURI;
  const verified = await device.post("/two-factor/verify-totp", {
    code: totpFromUri(uri),
  });
  expect(verified.status).toBe(200);
  return { uri, backupCodes: enabled.body.backupCodes as string[] };
}

beforeEach(async () => {
  await resetTestDatabase();
  vi.restoreAllMocks();
});

describe("two-factor sign-in", () => {
  it("asks for a code after the password and signs in with it", async () => {
    const { uri } = await userWithTwoFactor();
    const laptop = browser();

    const signIn = await laptop.post("/sign-in/email", {
      email: address,
      password,
    });

    expect(signIn.body.twoFactorRedirect).toBe(true);
    expect(laptop.has("session_token")).toBe(false);
    const wrong = await laptop.post("/two-factor/verify-totp", {
      code: "000000",
    });
    expect(wrong.status).toBe(401);
    const right = await laptop.post("/two-factor/verify-totp", {
      code: totpFromUri(uri),
    });
    expect(right.status).toBe(200);
    expect(laptop.has("session_token")).toBe(true);
  });

  it("asks only for the password on a remembered device", async () => {
    const { uri } = await userWithTwoFactor();
    const laptop = browser();
    await laptop.post("/sign-in/email", { email: address, password });
    await laptop.post("/two-factor/verify-totp", {
      code: totpFromUri(uri),
      trustDevice: true,
    });
    await laptop.post("/sign-out", {});

    const again = await laptop.post("/sign-in/email", {
      email: address,
      password,
    });

    expect(again.body.twoFactorRedirect).toBeUndefined();
    expect(laptop.has("session_token")).toBe(true);

    // Another device still needs the code.
    const phone = browser();
    const elsewhere = await phone.post("/sign-in/email", {
      email: address,
      password,
    });
    expect(elsewhere.body.twoFactorRedirect).toBe(true);
  });

  it("accepts a backup code once", async () => {
    const { backupCodes } = await userWithTwoFactor();
    const laptop = browser();
    await laptop.post("/sign-in/email", { email: address, password });

    const used = await laptop.post("/two-factor/verify-backup-code", {
      code: backupCodes[0],
    });
    expect(used.status).toBe(200);

    const phone = browser();
    await phone.post("/sign-in/email", { email: address, password });
    const reused = await phone.post("/two-factor/verify-backup-code", {
      code: backupCodes[0],
    });
    expect(reused.status).toBe(401);
  });

  it("asks for the code after an email code too", async () => {
    await userWithTwoFactor();
    const send = vi.spyOn(email, "sendOtpEmail").mockResolvedValue(undefined);
    const laptop = browser();
    await laptop.post("/email-otp/send-verification-otp", {
      email: address,
      type: "sign-in",
    });
    const otp = (send.mock.lastCall?.[2] as { otp: string } | undefined)?.otp;
    expect(otp).toBeTruthy();

    const signIn = await laptop.post("/sign-in/email-otp", {
      email: address,
      otp,
    });

    expect(signIn.body.twoFactorRedirect).toBe(true);
    expect(laptop.has("session_token")).toBe(false);
  });

  it("sends no magic link to an account with two-factor", async () => {
    await userWithTwoFactor();
    const sendMagicLink = vi
      .spyOn(email, "sendMagicLinkEmail")
      .mockResolvedValue(undefined);

    const other = browser();
    await other.post("/sign-up/email", {
      name: "Other",
      email: "other@example.com",
      password,
    });

    const response = await browser().post("/sign-in/magic-link", {
      email: address,
    });
    await browser().post("/sign-in/magic-link", { email: "other@example.com" });

    expect(response.status).toBe(200);
    expect(sendMagicLink).toHaveBeenCalledTimes(1);
    expect(sendMagicLink.mock.lastCall?.[0]).toBe("other@example.com");
  });
});
