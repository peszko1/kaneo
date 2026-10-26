import { onlineManager } from "@tanstack/react-query";
import queryClient from "@/query-client";
import { queuedEdits } from "./edit-outbox";
import { restoreSnapshot } from "./query-persister";
import { replayEdits } from "./replay-edits";
import { showTaskEdit } from "./task-edit";

const RETRY_MS = 30_000;

let offline = false;
let restored = false;
let retry: ReturnType<typeof setInterval> | undefined;

// The server is out of reach, even if the device has a network (a home
// server behind a VPN, say). Pausing onlineManager pauses queries, and
// changes are queued or blocked; the saved snapshot fills the cache once per
// page load. Snapshots are not saved offline, so queued edits are shown again
// on top of it.
export function goOffline(checkServer: () => void) {
  onlineManager.setOnline(false);
  if (offline) return;
  offline = true;
  retry = setInterval(checkServer, RETRY_MS);
  if (!restored) {
    restored = true;
    void restoreSnapshot()
      .catch(() => undefined)
      .then(() => {
        for (const edit of queuedEdits()) showTaskEdit(queryClient, edit);
      });
  }
}

export function goOnline() {
  if (!offline) {
    // Edits queued before a reload go out once the server answers.
    void replayEdits();
    return;
  }
  offline = false;
  clearInterval(retry);
  onlineManager.setOnline(true);
  // Queries don't refetch on mount, so drop the snapshot data no screen uses
  // and refetch the rest instead of showing it as current, after the queued
  // edits reach the server.
  queryClient.removeQueries({ type: "inactive" });
  void replayEdits().finally(() => queryClient.invalidateQueries());
}
