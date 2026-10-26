import { HTTPException } from "hono/http-exception";

// An offline edit sends the value it last saw as `expected`. If someone else
// changed the field since then, the edit answers 409 instead of overwriting
// the newer value. Edits without `expected` always apply.
export function assertFieldUnchanged<Value>(
  current: Value,
  expected: Value | undefined,
  next: Value,
) {
  if (expected === undefined) return;
  if (current === expected || current === next) return;
  throw new HTTPException(409, {
    message: "Someone else changed this field after the edit was made",
  });
}

// Dates compare by time, so "…Z" and "….000Z" are the same.
export const dateKey = (value: Date | string | null | undefined) =>
  value ? new Date(value).getTime() : null;
