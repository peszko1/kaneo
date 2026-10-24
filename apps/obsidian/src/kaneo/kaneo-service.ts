import { type App, Events } from "obsidian";
import { KaneoApiError } from "../api/api-error";
import { createKaneoClient } from "../api/client";
import type {
  BoardMeta,
  BoardTask,
  BoardTasksPage,
  BoardTasksQuery,
} from "../api/types";
import { resolveApiBase } from "../api/urls";
import { targetColumn } from "../commands/target-column";
import { QueryCache } from "../query/query-cache";
import type { KaneoSettings } from "../settings/settings";

const META_MAX_AGE_MS = 10 * 60_000;
// Long enough for blocks rendered together to share a request.
const TASKS_MAX_AGE_MS = 15_000;

/**
 * Talks to Kaneo for every block and command. Emits `changed` when shown data
 * goes stale, so blocks refresh after a task moves or the settings change.
 */
export class KaneoService extends Events {
  private metaCache = new QueryCache<BoardMeta>();
  private taskCache = new QueryCache<BoardTasksPage>();

  constructor(
    private app: App,
    private settings: () => KaneoSettings,
  ) {
    super();
  }

  private client() {
    const settings = this.settings();
    const apiBase = resolveApiBase(settings.webUrl, settings.apiUrl);
    if (!apiBase) {
      throw new KaneoApiError("Set your Kaneo address in the plugin settings.");
    }
    const apiKey = settings.apiKeySecret
      ? this.app.secretStorage.getSecret(settings.apiKeySecret)
      : null;
    if (!apiKey) {
      throw new KaneoApiError("Add a Kaneo API key in the plugin settings.");
    }
    return createKaneoClient(apiBase, apiKey);
  }

  meta(): Promise<BoardMeta> {
    return this.metaCache.get("meta", META_MAX_AGE_MS, async () => {
      const response = await this.client().task["global-board"].meta.$get();
      if (!response.ok) throw await KaneoApiError.fromResponse(response);
      return response.json();
    });
  }

  tasks(query: BoardTasksQuery): Promise<BoardTasksPage> {
    return this.taskCache.get(
      JSON.stringify(query),
      TASKS_MAX_AGE_MS,
      async () => {
        const response = await this.client().task["global-board"].$get({
          query,
        });
        if (!response.ok) throw await KaneoApiError.fromResponse(response);
        return response.json();
      },
    );
  }

  async setDone(task: BoardTask, done: boolean) {
    const project = (await this.meta()).projects.find(
      (candidate) => candidate.id === task.projectId,
    );
    const status = project && targetColumn(project.columns, done);
    if (!status) {
      throw new KaneoApiError(
        done
          ? `${task.projectName} has no column marked as done.`
          : `${task.projectName} has no open column.`,
      );
    }
    if (status === task.status) return;

    const response = await this.client().task.status[":id"].$put({
      param: { id: task.id },
      json: { status },
    });
    if (!response.ok) throw await KaneoApiError.fromResponse(response);
    this.refresh();
  }

  /** Drops cached data and tells every block to load again. */
  refresh({ meta = false } = {}) {
    this.taskCache.clear();
    if (meta) this.metaCache.clear();
    this.trigger("changed");
  }
}

export function describeError(error: unknown): string {
  if (error instanceof KaneoApiError) {
    if (error.status === 401) return "Kaneo rejected the API key.";
    if (error.status === 429) {
      return "Too many requests to Kaneo. Try again in a minute.";
    }
    return error.message;
  }
  return error instanceof Error
    ? `Could not reach Kaneo: ${error.message}`
    : "Could not reach Kaneo.";
}
