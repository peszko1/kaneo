import { savedSessionUserId } from "./saved-session";
import { type TaskEdit, taskEditKey } from "./task-edit";

export type QueuedEdit = TaskEdit & { id: string; at: number };

// One queue per user, shared by every tab through localStorage.
const key = () => `kaneo:offline-edits:${savedSessionUserId()}`;
const listeners = new Set<() => void>();
let cached: { raw: string | null; edits: QueuedEdit[] } = {
  raw: null,
  edits: [],
};

export function queuedEdits(): QueuedEdit[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key());
  } catch {
    // Storage blocked: nothing can be queued either.
  }
  // Returns the same array while nothing changed, for useSyncExternalStore.
  if (raw === cached.raw) return cached.edits;
  let edits: QueuedEdit[] = [];
  try {
    edits = raw ? (JSON.parse(raw) as QueuedEdit[]) : [];
  } catch {
    edits = [];
  }
  cached = { raw, edits };
  return edits;
}

function write(edits: QueuedEdit[]) {
  try {
    if (edits.length === 0) localStorage.removeItem(key());
    else localStorage.setItem(key(), JSON.stringify(edits));
  } catch {
    // Storage full or blocked: the edit stays in this page's cache only.
  }
  for (const listener of listeners) listener();
}

export function queueEdit(edit: TaskEdit) {
  const editKey = taskEditKey(edit);
  write([
    ...queuedEdits().filter((queued) => taskEditKey(queued) !== editKey),
    { ...edit, id: crypto.randomUUID(), at: Date.now() },
  ]);
}

export function removeEdits(ids: string[]) {
  if (ids.length === 0) return;
  const done = new Set(ids);
  write(queuedEdits().filter((edit) => !done.has(edit.id)));
}

export function clearEdits() {
  write([]);
}

// Notifies on changes from this tab and from other tabs.
export function subscribeToEdits(listener: () => void) {
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
