import { onlineManager } from "@tanstack/react-query";
import queryClient from "@/query-client";
import { queueEdit } from "./edit-outbox";
import { sendTaskEdit } from "./send-task-edit";
import { showTaskEdit } from "./show-task-edit";
import type { TaskEdit } from "./task-edit";

// Sends the edit now, or queues it while the server is out of reach and
// shows it at once. Returns null for a queued edit. `send` lets a caller keep
// its own request and typed answer online.
export async function saveTaskEdit<Result = unknown>(
  edit: TaskEdit,
  send: () => Promise<Result> = () => sendTaskEdit(edit) as Promise<Result>,
): Promise<Result | null> {
  if (onlineManager.isOnline()) return send();
  queueEdit(edit);
  showTaskEdit(queryClient, edit);
  return null;
}
