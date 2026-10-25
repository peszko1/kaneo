import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { auth } from "../../apps/api/src/auth";
import { createApp } from "../../apps/api/src/index";
import { resetTestDatabase } from "./helpers/database";

const origin = "http://localhost:5173";
const address = "limit@example.com";
const password = "correct-password-123";

let baseUrl = "";
let close: () => Promise<void> = async () => {};

function post(path: string, body: unknown, clientIp: string) {
  return fetch(`${baseUrl}/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Origin: origin,
      "x-forwarded-for": clientIp,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("TRUSTED_PROXIES", "127.0.0.0/8");
  const { app } = createApp();
  const signUp = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", Origin: origin },
    body: JSON.stringify({ name: "Limit", email: address, password }),
  });
  expect(signUp.status).toBe(200);

  const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  (await auth.$context).rateLimit.enabled = true;
});

afterEach(async () => {
  (await auth.$context).rateLimit.enabled = false;
  await close();
  vi.unstubAllEnvs();
});

describe("auth rate limit without Redis", () => {
  it("stops password guessing from one client", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 30; i++) {
      const response = await post(
        "/sign-in/email",
        { email: address, password: `wrong-${i}` },
        "203.0.113.10",
      );
      await response.text();
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses.slice(10).every((status) => status === 429)).toBe(true);

    const correct = await post(
      "/sign-in/email",
      { email: address, password },
      "203.0.113.10",
    );
    expect(correct.status).toBe(429);
    expect(await correct.json()).toMatchObject({ code: expect.any(String) });
  });

  it("keeps other clients signing in", async () => {
    for (let i = 0; i < 11; i++) {
      await (
        await post(
          "/sign-in/email",
          { email: address, password: "wrong" },
          "203.0.113.20",
        )
      ).text();
    }

    const other = await post(
      "/sign-in/email",
      { email: address, password },
      "203.0.113.21",
    );
    expect(other.status).toBe(200);
  });

  it("limits email code checks and password reset requests", async () => {
    const checks: number[] = [];
    for (let i = 0; i < 11; i++) {
      const response = await post(
        "/email-otp/check-verification-otp",
        { email: address, otp: "000000", type: "sign-in" },
        "203.0.113.30",
      );
      await response.text();
      checks.push(response.status);
    }
    expect(checks.at(-1)).toBe(429);
    expect(checks.slice(0, 10)).not.toContain(429);

    const resets: number[] = [];
    for (let i = 0; i < 4; i++) {
      const response = await post(
        "/request-password-reset",
        { email: address, redirectTo: `${origin}/auth/reset-password` },
        "203.0.113.31",
      );
      await response.text();
      resets.push(response.status);
    }
    expect(resets.at(-1)).toBe(429);
    expect(resets.slice(0, 3)).not.toContain(429);
  });
});
