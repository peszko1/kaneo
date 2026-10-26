import type { TaskReorder } from "@/fetchers/task/reorder-tasks";

type FieldEdit<Kind extends string, Value> = {
  kind: Kind;
  taskId: string;
  projectId: string;
} & Value;

// A change to an existing task that can wait for the server. Each one sets a
// value, so sending it twice does no harm, except a move: the server answers
// a repeated move with 409, and the move is dropped although it went through.
export type TaskEdit =
  | FieldEdit<"status", { status: string }>
  | FieldEdit<"title", { title: string }>
  | FieldEdit<"priority", { priority: string }>
  | FieldEdit<"dueDate", { dueDate: string | null }>
  | FieldEdit<"startDate", { startDate: string | null }>
  | FieldEdit<"assignee", { userId: string | null }>
  // A task label is the server's copy of a workspace label, so it is found
  // by name. `taskLabelId` is that copy's id, known only for one the server
  // made.
  | FieldEdit<
      "label",
      {
        name: string;
        color: string;
        workspaceLabelId: string;
        attached: boolean;
        taskLabelId?: string;
      }
    >
  // The server checks `expectedTasks` and answers 409 if the board changed.
  | ({ kind: "reorder" } & Required<TaskReorder>);

// Edits with the same key set the same field. Moves build on each other, so
// none of them shares a key.
export function taskEditKey(edit: TaskEdit) {
  if (edit.kind === "reorder") return null;
  if (edit.kind === "label") return `label:${edit.taskId}:${edit.name}`;
  return `${edit.kind}:${edit.taskId}`;
}

export function editedTaskIds(edit: TaskEdit) {
  return edit.kind === "reorder"
    ? edit.tasks.map((task) => task.id)
    : [edit.taskId];
}
