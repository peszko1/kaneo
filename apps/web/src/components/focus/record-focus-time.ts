import createTimeEntry from "@/fetchers/time-entry/create-time-entry";
import { HttpError } from "@/lib/http-error";
import queryClient from "@/query-client";

// Focus time that versions before the server kept the timer could not send.
// The server records focus time now; this only sends what is still queued.
type FocusSegment = {
  taskId: string;
  startTime: number;
  endTime: number;
};

const PENDING_KEY = "focus-pending";
const LOCK_NAME = "kaneo-focus-record";

function readList<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage can be full or blocked; the entry is then simply not retried.
  }
}

// Every open tab flushes on load, so the flush runs under a cross-tab lock.
function withLock(task: () => Promise<void>) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, task);
  }
  return task();
}

async function send(segment: FocusSegment) {
  try {
    await createTimeEntry({
      taskId: segment.taskId,
      startTime: new Date(segment.startTime).toISOString(),
      endTime: new Date(segment.endTime).toISOString(),
    });
    void queryClient.invalidateQueries({
      queryKey: ["time-entries", segment.taskId],
    });
    void queryClient.invalidateQueries({ queryKey: ["time-summary"] });
    return "sent";
  } catch (error) {
    // A 4xx (no permission, deleted task) will never succeed, so drop it.
    if (error instanceof HttpError && error.status < 500) return "dropped";
    return "retry";
  }
}

export function flushPendingFocusTime() {
  void withLock(async () => {
    const pending = readList<FocusSegment>(PENDING_KEY);
    if (pending.length === 0) return;
    const left: FocusSegment[] = [];
    for (const segment of pending) {
      if ((await send(segment)) === "retry") left.push(segment);
    }
    writeList(PENDING_KEY, left);
  });
}
