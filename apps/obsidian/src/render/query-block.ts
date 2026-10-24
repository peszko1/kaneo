import { MarkdownRenderChild, Notice, parseYaml, setIcon } from "obsidian";
import type { BoardMeta, BoardTask } from "../api/types";
import { taskUrl } from "../api/urls";
import { isFinalStatus } from "../commands/target-column";
import { describeError, type KaneoService } from "../kaneo/kaneo-service";
import { arrangeTasks } from "../query/arrange-tasks";
import { type ParseResult, parseQuery } from "../query/parse-query";
import { toBoardParams } from "../query/to-board-params";
import type { KaneoQuery } from "../query/vocabulary";
import type { KaneoSettings } from "../settings/settings";
import { renderTaskItem } from "./task-item";

function parseSource(source: string, filename: string): ParseResult {
  try {
    return parseQuery(parseYaml(source), { filename });
  } catch {
    return { ok: false, error: "The block is not valid YAML." };
  }
}

/** One `kaneo` code block: loads its query and refreshes while it is on screen. */
export class KaneoQueryBlock extends MarkdownRenderChild {
  private parsed: ParseResult;
  private body!: HTMLElement;
  private refreshButton!: HTMLButtonElement;
  private visible = true;
  private stale = false;
  private loading = false;

  constructor(
    containerEl: HTMLElement,
    source: string,
    filename: string,
    private service: KaneoService,
    private settings: () => KaneoSettings,
  ) {
    super(containerEl);
    this.parsed = parseSource(source, filename);
  }

  onload() {
    const root = this.containerEl.createDiv({ cls: "kaneo-query" });
    const header = root.createDiv({ cls: "kaneo-query-header" });
    header.createSpan({
      cls: "kaneo-query-name",
      text: (this.parsed.ok && this.parsed.query.name) || "Kaneo",
    });
    this.refreshButton = header.createEl("button", {
      cls: "clickable-icon kaneo-query-refresh",
      attr: { "aria-label": "Refresh tasks" },
    });
    setIcon(this.refreshButton, "refresh-cw");
    this.registerDomEvent(this.refreshButton, "click", () =>
      this.service.refresh(),
    );
    this.body = root.createDiv({ cls: "kaneo-query-body" });

    if (!this.parsed.ok) {
      this.showMessage(this.parsed.error, true);
      this.refreshButton.disabled = true;
      return;
    }
    const query = this.parsed.query;

    this.registerEvent(this.service.on("changed", () => this.requestLoad()));

    const observer = new IntersectionObserver((entries) => {
      this.visible = entries.some((entry) => entry.isIntersecting);
      if (this.visible && this.stale) void this.loadTasks(query);
    });
    observer.observe(this.containerEl);
    this.register(() => observer.disconnect());

    const seconds = query.autorefresh ?? this.settings().autorefreshSeconds;
    if (seconds > 0) {
      this.registerInterval(
        window.setInterval(() => this.requestLoad(), seconds * 1000),
      );
    }

    this.showMessage("Loading tasks…");
    void this.loadTasks(query);
  }

  // Off-screen blocks wait until they scroll into view.
  private requestLoad() {
    if (!this.parsed.ok) return;
    if (this.visible) void this.loadTasks(this.parsed.query);
    else this.stale = true;
  }

  private async loadTasks(query: KaneoQuery) {
    if (this.loading) return;
    this.loading = true;
    this.stale = false;
    this.refreshButton.addClass("is-loading");
    this.body.setAttr("aria-busy", "true");
    try {
      const meta = await this.service.meta();
      const request = toBoardParams(query, meta);
      if (!request.ok) {
        this.showMessage(request.error, true);
        return;
      }
      const pages = await Promise.all(
        request.params.map((params) => this.service.tasks(params)),
      );
      this.renderTasks(query, meta, pages);
    } catch (error) {
      this.showMessage(describeError(error), true);
    } finally {
      this.loading = false;
      this.refreshButton.removeClass("is-loading");
      this.body.removeAttribute("aria-busy");
    }
  }

  private showMessage(text: string, isError = false) {
    this.body.empty();
    this.body.createDiv({
      cls: isError ? "kaneo-query-error" : "kaneo-query-message",
      text,
    });
  }

  private renderTasks(
    query: KaneoQuery,
    meta: BoardMeta,
    pages: { tasks: BoardTask[]; pagination: { total: number } }[],
  ) {
    const tasks = pages.flatMap((page) => page.tasks);
    if (!tasks.length) {
      this.showMessage("No matching tasks.");
      return;
    }

    const columns = new Map(
      meta.projects.map((project) => [project.id, project.columns]),
    );
    const movable = new Set(
      meta.workspaces
        .filter((workspace) => workspace.canMoveTasks)
        .map((workspace) => workspace.id),
    );
    const webUrl = this.settings().webUrl;

    this.body.empty();
    for (const group of arrangeTasks(tasks, query.groupBy, query.sort)) {
      if (group.title !== null) {
        this.body.createDiv({ cls: "kaneo-query-group", text: group.title });
      }
      const list = this.body.createEl("ul", { cls: "contains-task-list" });
      for (const task of group.tasks) {
        renderTaskItem(list, task, {
          show: query.show,
          url: taskUrl(webUrl, task),
          done: isFinalStatus(columns.get(task.projectId) ?? [], task.status),
          canToggle: movable.has(task.workspaceId),
          onToggle: async (done) => {
            try {
              await this.service.setDone(task, done);
            } catch (error) {
              new Notice(describeError(error));
              throw error;
            }
          },
        });
      }
    }

    const total = pages.reduce((sum, page) => sum + page.pagination.total, 0);
    if (total > tasks.length) {
      this.body.createDiv({
        cls: "kaneo-query-message",
        text: `Showing ${tasks.length} of ${total} tasks. Narrow the query to see the rest.`,
      });
    }
  }
}
