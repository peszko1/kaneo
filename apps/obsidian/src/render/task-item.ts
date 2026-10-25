import type { BoardTask } from "../api/types";
import type { ShowField } from "../query/vocabulary";

type TaskItemOptions = {
  show: ShowField[];
  url: string;
  done: boolean;
  canToggle: boolean;
  /** Rejects when the change failed, so the checkbox flips back. */
  onToggle: (done: boolean) => Promise<void>;
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function renderField(
  parent: HTMLElement,
  task: BoardTask,
  field: ShowField,
  done: boolean,
) {
  switch (field) {
    case "ticket":
      if (task.number != null) {
        parent.createSpan({
          cls: "kaneo-task-ticket",
          text: `${task.projectSlug}-${task.number}`,
        });
      }
      return;
    case "due": {
      if (!task.dueDate) return;
      const due = new Date(task.dueDate);
      parent.createSpan({
        cls: [
          "kaneo-task-due",
          ...(!done && due.getTime() < startOfToday() ? ["is-overdue"] : []),
        ],
        text: due.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      });
      return;
    }
    case "project":
      parent.createSpan({ cls: "kaneo-task-project", text: task.projectName });
      return;
    case "labels":
      for (const label of task.labels) {
        parent
          .createSpan({ cls: "kaneo-task-label", text: label.name })
          .style.setProperty("--kaneo-label-color", label.color);
      }
      return;
    case "priority":
      if (task.priority !== "no-priority") {
        parent.createSpan({
          cls: "kaneo-task-priority",
          text: task.priority,
          attr: { "data-priority": task.priority },
        });
      }
      return;
    case "status":
      parent.createSpan({
        cls: "kaneo-task-status",
        text: task.statusName ?? task.status,
      });
      return;
    case "assignee":
      parent.createSpan({
        cls: "kaneo-task-assignee",
        text: task.assignee?.name ?? "Unassigned",
      });
      return;
  }
}

export function renderTaskItem(
  list: HTMLElement,
  task: BoardTask,
  options: TaskItemOptions,
) {
  const item = list.createEl("li", { cls: "task-list-item kaneo-task" });
  item.toggleClass("is-checked", options.done);

  const checkbox = item.createEl("input", {
    type: "checkbox",
    cls: "task-list-item-checkbox",
    attr: {
      "aria-label": options.done
        ? `Reopen ${task.title}`
        : `Mark ${task.title} done`,
    },
  });
  checkbox.checked = options.done;
  checkbox.disabled = !options.canToggle;
  if (!options.canToggle) {
    checkbox.title = "You cannot change tasks in this workspace.";
  }
  checkbox.addEventListener("change", async () => {
    const done = checkbox.checked;
    checkbox.disabled = true;
    try {
      await options.onToggle(done);
      item.toggleClass("is-checked", done);
    } catch {
      checkbox.checked = !done;
    } finally {
      checkbox.disabled = false;
    }
  });

  item.createEl("a", {
    cls: "external-link kaneo-task-title",
    text: task.title,
    href: options.url,
    attr: { target: "_blank", rel: "noopener" },
  });

  const details = item.createSpan({ cls: "kaneo-task-details" });
  for (const field of options.show)
    renderField(details, task, field, options.done);
  if (!details.childElementCount) details.remove();
}
