import {
  DUE_FILTERS,
  GROUP_KEYS,
  type KaneoQuery,
  PRIORITIES,
  SHOW_FIELDS,
  SORT_KEYS,
  STATUSES,
} from "./vocabulary";

export type ParseResult =
  | { ok: true; query: KaneoQuery }
  | { ok: false; error: string };

type Context = { filename: string };

const KNOWN_KEYS = new Set([
  "name",
  "assignee",
  "project",
  "priority",
  "label",
  "due",
  "status",
  "q",
  "groupBy",
  "sort",
  "show",
  "autorefresh",
]);

class QueryError extends Error {}

function text(raw: unknown, key: string, context: Context) {
  const value = typeof raw === "number" ? String(raw) : raw;
  if (typeof value !== "string") {
    throw new QueryError(`\`${key}\` must be text.`);
  }
  return value.replaceAll("{{filename}}", context.filename).trim();
}

function list(value: unknown, key: string, context: Context) {
  if (value == null) return [];
  return [value]
    .flat()
    .map((item) => text(item, key, context))
    .filter(Boolean);
}

function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  key: string,
): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new QueryError(
      `\`${key}\` cannot be "${value}". Use one of: ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}

function enumList<T extends string>(
  value: unknown,
  allowed: readonly T[],
  key: string,
  context: Context,
) {
  return list(value, key, context).map((item) => oneOf(item, allowed, key));
}

/** Validates a parsed `kaneo` code block; `{{filename}}` becomes the note's name. */
export function parseQuery(raw: unknown, context: Context): ParseResult {
  const block = raw ?? {};
  if (typeof block !== "object" || Array.isArray(block)) {
    return { ok: false, error: "The block must contain `key: value` lines." };
  }
  const source = block as Record<string, unknown>;

  try {
    const unknownKey = Object.keys(source).find((key) => !KNOWN_KEYS.has(key));
    if (unknownKey) throw new QueryError(`Unknown option \`${unknownKey}\`.`);

    let autorefresh: number | undefined;
    if (source.autorefresh != null) {
      autorefresh = Number(source.autorefresh);
      if (!Number.isFinite(autorefresh) || autorefresh < 0) {
        throw new QueryError("`autorefresh` must be a number of seconds.");
      }
    }

    const status = enumList(source.status, STATUSES, "status", context);
    const name =
      source.name == null ? undefined : text(source.name, "name", context);
    const q = source.q == null ? undefined : text(source.q, "q", context);
    const groupBy =
      source.groupBy == null
        ? undefined
        : oneOf(
            text(source.groupBy, "groupBy", context),
            GROUP_KEYS,
            "groupBy",
          );
    const show = enumList(source.show, SHOW_FIELDS, "show", context);

    return {
      ok: true,
      query: {
        name: name || undefined,
        assignee: list(source.assignee, "assignee", context),
        project: list(source.project, "project", context),
        priority: enumList(source.priority, PRIORITIES, "priority", context),
        label: list(source.label, "label", context),
        due: enumList(source.due, DUE_FILTERS, "due", context),
        status: status.length ? [...new Set(status)] : ["to-do", "in-progress"],
        q: q || undefined,
        groupBy,
        sort: enumList(source.sort, SORT_KEYS, "sort", context),
        show: show.length ? show : ["ticket", "due", "project"],
        autorefresh,
      },
    };
  } catch (error) {
    if (error instanceof QueryError) return { ok: false, error: error.message };
    throw error;
  }
}
