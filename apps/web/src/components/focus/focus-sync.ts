import getFocusSession, {
  type ServerFocusSession,
} from "@/fetchers/focus/get-focus-session";
import sendFocusChange from "@/fetchers/focus/send-focus-change";
import { HttpError } from "@/lib/http-error";
import queryClient from "@/query-client";
import { useFocusStore } from "@/store/focus";
import {
  onFocusChangeQueued,
  queueFocusChange,
  readFocusVersion,
  readOutbox,
  writeFocusVersion,
  writeOutbox,
} from "./focus-outbox";

const LOCK_NAME = "kaneo-focus-sync";

function withLock(task: () => Promise<void>) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, task);
  }
  return task();
}

function refreshTrackedTime(taskId: string) {
  void queryClient.invalidateQueries({ queryKey: ["time-entries", taskId] });
  void queryClient.invalidateQueries({ queryKey: ["time-summary"] });
  void queryClient.invalidateQueries({ queryKey: ["project-time-totals"] });
}

function adopt(server: ServerFocusSession | null) {
  writeFocusVersion(server?.version ?? null);
  useFocusStore.getState().showServerSession(server);
}

// Sends queued changes in order, each on the version the one before it made.
// When another device changed the timer first, its timer wins and the queued
// changes are dropped. Then takes any newer timer from the server.
async function sync() {
  // A refused change leaves the local timer wrong, so the server's wins.
  let refused = false;
  for (;;) {
    const [change] = readOutbox();
    if (!change) break;
    let outcome: Awaited<ReturnType<typeof sendFocusChange>>;
    try {
      outcome = await sendFocusChange({
        baseVersion: readFocusVersion(),
        at: change.at,
        next: change.next,
      });
    } catch (error) {
      // A 4xx (deleted task, lost access) will never succeed, so drop it.
      if (error instanceof HttpError && error.status < 500) {
        writeOutbox(readOutbox().slice(1));
        refused = true;
        continue;
      }
      // Offline or the server is down: the next sync sends it.
      return;
    }
    const { conflict, result } = outcome;
    if (result.recordedTaskId) refreshTrackedTime(result.recordedTaskId);
    if (conflict) {
      writeOutbox([]);
      adopt(result.session);
      return;
    }
    writeFocusVersion(result.session?.version ?? null);
    // Other tabs only append, so the sent change is still the first.
    writeOutbox(readOutbox().slice(1));
  }

  let server: ServerFocusSession | null;
  try {
    server = (await getFocusSession()).session;
  } catch {
    return;
  }
  if (readOutbox().length > 0) return;
  if (refused) return adopt(server);
  const version = readFocusVersion();
  const { session, alarmAt } = useFocusStore.getState();
  if (!server && session && version === null) {
    // A timer started before the server kept one, or before sign-in.
    queueFocusChange({ at: Date.now(), next: { ...session, alarmAt } });
    return;
  }
  if ((server?.version ?? null) !== version) adopt(server);
}

export function syncFocusSession() {
  return withLock(sync);
}

onFocusChangeQueued(() => void syncFocusSession());
