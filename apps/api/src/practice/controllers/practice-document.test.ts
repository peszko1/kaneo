import { beforeEach, expect, it, vi } from "vite-plus/test";
import { readPractice, savePractice } from "./practice-document";

// An in-memory store with the same compare-and-set rule as Redis and the DB.
const store = vi.hoisted(() => {
  const documents = new Map<string, { data: unknown; version: number }>();
  return {
    documents,
    readUserDocument: vi.fn(
      async (userId: string, kind: string) =>
        documents.get(`${userId}:${kind}`) ?? null,
    ),
    saveUserDocument: vi.fn(
      async (userId: string, kind: string, data: unknown, expected: number) => {
        const key = `${userId}:${kind}`;
        const current = documents.get(key) ?? null;
        if ((current?.version ?? 0) !== expected)
          return { saved: false, document: current };
        const document = { data, version: expected + 1 };
        documents.set(key, document);
        return { saved: true, document };
      },
    ),
  };
});
vi.mock("../document-store", () => store);

beforeEach(() => store.documents.clear());

it("starts empty and switched off", async () => {
  expect(await readPractice("u1")).toEqual({
    enabled: false,
    config: null,
    state: null,
    version: 0,
  });
});

it("keeps the fields a change does not send", async () => {
  await savePractice("u1", { version: 0, enabled: true });
  await savePractice("u1", {
    version: 1,
    state: { entries: {} },
    config: "lessons: []",
  });
  expect(await savePractice("u1", { version: 2, enabled: false })).toEqual({
    saved: true,
    practice: {
      enabled: false,
      config: "lessons: []",
      state: { entries: {} },
      version: 3,
    },
  });
});

it("refuses a change made on an older version and returns the stored one", async () => {
  await savePractice("u1", { version: 0, state: { a: 1 } });
  const result = await savePractice("u1", { version: 0, state: { a: 2 } });
  expect(result).toEqual({
    saved: false,
    practice: { enabled: false, config: null, state: { a: 1 }, version: 1 },
  });
});

it("keeps each user's document apart", async () => {
  await savePractice("u1", { version: 0, enabled: true });
  expect((await readPractice("u2")).enabled).toBe(false);
});
