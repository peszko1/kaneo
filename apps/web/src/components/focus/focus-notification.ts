import i18n from "i18next";
import queryClient from "@/query-client";
import type { FocusSession } from "./focus-timer";

const TAG = "kaneo-focus";

export function canNotify() {
  return typeof Notification !== "undefined";
}

export async function requestNotificationPermission() {
  if (!canNotify()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

// Every open tab settles the same phase; the shared tag makes the system
// show a single notification.
export function showPhaseEndedNotification(session: FocusSession) {
  if (!canNotify() || Notification.permission !== "granted") return;
  const task = queryClient.getQueryData<{ title?: string }>([
    "task",
    session.taskId,
  ]);
  const title = i18n.t(
    session.phase === "focus"
      ? "tasks:focus.notification.focusEnded"
      : "tasks:focus.notification.breakEnded",
  );
  try {
    new Notification(title, { body: task?.title, tag: TAG });
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}
