import { savedSessionUserId } from "./saved-session";

// A description edited offline that the server refused, because someone
// else changed the description first. It waits until the user keeps it or
// uses theirs.
export type DescriptionConflict = {
  taskId: string;
  projectId: string;
  mine: string;
  at: number;
};

const key = () => `kaneo:offline-description-conflicts:${savedSessionUserId()}`;
const listeners = new Set<() => void>();
let cached: { raw: string | null; conflicts: DescriptionConflict[] } = {
  raw: null,
  conflicts: [],
};

function conflicts(): DescriptionConflict[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key());
  } catch {
    // Storage blocked: nothing was kept.
  }
  if (raw === cached.raw) return cached.conflicts;
  let parsed: DescriptionConflict[] = [];
  try {
    parsed = raw ? (JSON.parse(raw) as DescriptionConflict[]) : [];
  } catch {
    parsed = [];
  }
  cached = { raw, conflicts: parsed };
  return parsed;
}

function write(next: DescriptionConflict[]) {
  try {
    if (next.length === 0) localStorage.removeItem(key());
    else localStorage.setItem(key(), JSON.stringify(next));
  } catch {
    // Storage full or blocked: the user's text is lost with this page.
  }
  for (const listener of listeners) listener();
}

// Returns the same object while nothing changed, for useSyncExternalStore.
export function descriptionConflict(taskId: string) {
  return conflicts().find((conflict) => conflict.taskId === taskId);
}

export function keepDescriptionConflict(conflict: DescriptionConflict) {
  write([
    ...conflicts().filter((existing) => existing.taskId !== conflict.taskId),
    conflict,
  ]);
}

export function resolveDescriptionConflict(taskId: string) {
  write(conflicts().filter((conflict) => conflict.taskId !== taskId));
}

export function clearDescriptionConflicts() {
  write([]);
}

// Notifies on changes from this tab and from other tabs.
export function subscribeToDescriptionConflicts(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key()) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
