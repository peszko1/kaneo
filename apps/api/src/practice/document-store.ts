import { and, eq } from "drizzle-orm";
import db from "../database";
import { userDocumentTable } from "../database/schema";
import { getRedisPub, isRedisConfigured } from "../redis";

export type StoredDocument = { data: unknown; version: number };

// Saves only when the stored version is still `expected` (0 = no document).
// Returns the stored document when it is not, so the caller can merge.
export type SaveResult =
  | { saved: true; document: StoredDocument }
  | { saved: false; document: StoredDocument | null };

const redisKey = (userId: string, kind: string) =>
  `kaneo:user-document:{${userId}}:${kind}`;

// Compare-and-set in one step, so two devices cannot both win.
const SAVE_SCRIPT = `
local current = redis.call("GET", KEYS[1])
local version = 0
if current then version = cjson.decode(current).version end
if version ~= tonumber(ARGV[1]) then return current or false end
redis.call("SET", KEYS[1], ARGV[2])
return "OK"
`;

async function readRedis(userId: string, kind: string) {
  const raw = await getRedisPub().get(redisKey(userId, kind));
  return raw ? (JSON.parse(raw) as StoredDocument) : null;
}

async function saveRedis(
  userId: string,
  kind: string,
  data: unknown,
  expected: number,
): Promise<SaveResult> {
  const document = { data, version: expected + 1 };
  const result = await getRedisPub().eval(
    SAVE_SCRIPT,
    1,
    redisKey(userId, kind),
    String(expected),
    JSON.stringify(document),
  );
  if (result === "OK") return { saved: true, document };
  return {
    saved: false,
    document: typeof result === "string" ? JSON.parse(result) : null,
  };
}

async function readDb(userId: string, kind: string) {
  const [row] = await db
    .select({
      data: userDocumentTable.data,
      version: userDocumentTable.version,
    })
    .from(userDocumentTable)
    .where(
      and(
        eq(userDocumentTable.userId, userId),
        eq(userDocumentTable.kind, kind),
      ),
    );
  return row ?? null;
}

async function saveDb(
  userId: string,
  kind: string,
  data: unknown,
  expected: number,
): Promise<SaveResult> {
  const where = and(
    eq(userDocumentTable.userId, userId),
    eq(userDocumentTable.kind, kind),
    eq(userDocumentTable.version, expected),
  );
  const rows =
    expected === 0
      ? await db
          .insert(userDocumentTable)
          .values({ userId, kind, data, version: 1 })
          .onConflictDoNothing()
          .returning({ version: userDocumentTable.version })
      : await db
          .update(userDocumentTable)
          .set({ data, version: expected + 1, updatedAt: new Date() })
          .where(where)
          .returning({ version: userDocumentTable.version });
  if (rows[0])
    return { saved: true, document: { data, version: rows[0].version } };
  return { saved: false, document: await readDb(userId, kind) };
}

export function readUserDocument(userId: string, kind: string) {
  return isRedisConfigured() ? readRedis(userId, kind) : readDb(userId, kind);
}

export function saveUserDocument(
  userId: string,
  kind: string,
  data: unknown,
  expected: number,
) {
  return isRedisConfigured()
    ? saveRedis(userId, kind, data, expected)
    : saveDb(userId, kind, data, expected);
}
