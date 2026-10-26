import { onlineManager } from "@tanstack/react-query";
import queryClient from "@/query-client";
import { queueEdit } from "./edit-outbox";
import { sendTaskEdit, showTaskEdit, type TaskEdit } from "./task-edit";

// Sends the edit now, or queues it while the server is out of reach and
// shows it at once. Returns null for a queued edit.
export async function saveTaskEdit(edit: TaskEdit) {
  if (onlineManager.isOnline()) return sendTaskEdit(edit);
  queueEdit(edit);
  showTaskEdit(queryClient, edit);
  return null;
}
