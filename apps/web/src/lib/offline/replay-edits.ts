import i18n from "i18next";
import { HttpError } from "@/lib/http-error";
import { toast } from "@/lib/toast";
import queryClient from "@/query-client";
import { keepDescriptionConflict } from "./description-conflicts";
import { queuedEdits, removeEdits } from "./edit-outbox";
import { sendTaskEdit } from "./send-task-edit";
import { editedTaskIds } from "./task-edit";

// Only the tab that holds this lock sends the queue, so no edit goes twice.
const REPLAY_LOCK = "kaneo-offline-edits";

// The server can take the edit later: keep it.
function isWorthRetrying(error: unknown) {
  if (!(error instanceof HttpError)) return true;
  return (
    error.status === 401 ||
    error.status === 408 ||
    error.status === 429 ||
    error.status >= 500
  );
}

async function sendQueue() {
  const sent: string[] = [];
  const dropped: string[] = [];
  const conflicted: string[] = [];
  const descriptionConflicts: string[] = [];
  const touched = new Set<string>();
  try {
    for (const edit of queuedEdits()) {
      try {
        await sendTaskEdit(edit);
        sent.push(edit.id);
      } catch (error) {
        // Stop at the first edit the server could take later, so edits
        // still go in the order they were made.
        if (isWorthRetrying(error)) break;
        // 409: someone else changed the field or the board first, and their
        // change stays.
        if (!(error instanceof HttpError && error.status === 409))
          dropped.push(edit.id);
        // Losing a description loses real text, so the user chooses.
        else if (edit.kind === "description") {
          keepDescriptionConflict({
            taskId: edit.taskId,
            projectId: edit.projectId,
            mine: edit.description,
            at: edit.at,
          });
          descriptionConflicts.push(edit.id);
        } else conflicted.push(edit.id);
      }
      for (const id of editedTaskIds(edit)) touched.add(id);
      touched.add(edit.projectId);
    }
  } finally {
    removeEdits([...sent, ...dropped, ...conflicted, ...descriptionConflicts]);
  }

  if (descriptionConflicts.length > 0) {
    toast.error(
      i18n.t("common:offline.descriptionConflict", {
        count: descriptionConflicts.length,
      }),
    );
  }
  if (conflicted.length > 0) {
    toast.error(
      i18n.t("common:offline.editsConflicted", { count: conflicted.length }),
    );
  }
  if (dropped.length > 0) {
    toast.error(
      i18n.t("common:offline.editsDropped", { count: dropped.length }),
    );
  }
  for (const id of touched) {
    void queryClient.invalidateQueries({ queryKey: ["task", id] });
    void queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    void queryClient.invalidateQueries({ queryKey: ["labels", id] });
  }
}

// Sends the edits queued while offline, oldest first, and removes each one
// once the server answers.
export async function replayEdits() {
  if (queuedEdits().length === 0) return;
  if (!navigator.locks) return sendQueue();
  // Another tab that already holds the lock sends the queue instead.
  await navigator.locks.request(REPLAY_LOCK, { ifAvailable: true }, (lock) =>
    lock ? sendQueue() : undefined,
  );
}
