import type { FocusSession } from "./focus-timer";

// A timer change waiting to reach the server. `at` is when it happened, so a
// change made offline still records the right focus time.
export type FocusChange = {
  at: number;
  next: (FocusSession & { alarmAt: number | null }) | null;
};

const OUTBOX_KEY = "focus-outbox";
// The server version the local timer is based on; null before it is saved.
const VERSION_KEY = "focus-version";

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the server copy then wins on next sync.
  }
}

export function readOutbox(): FocusChange[] {
  const list = read<unknown>(OUTBOX_KEY, []);
  return Array.isArray(list) ? list : [];
}

export const writeOutbox = (changes: FocusChange[]) =>
  write(OUTBOX_KEY, changes);

export function readFocusVersion(): number | null {
  const version = read<unknown>(VERSION_KEY, null);
  return typeof version === "number" ? version : null;
}

export const writeFocusVersion = (version: number | null) =>
  write(VERSION_KEY, version);

let onQueued = () => {};

export function onFocusChangeQueued(listener: () => void) {
  onQueued = listener;
}

export function queueFocusChange(change: FocusChange) {
  writeOutbox([...readOutbox(), change]);
  onQueued();
}
