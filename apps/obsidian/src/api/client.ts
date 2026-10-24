import type { AppType } from "@kaneo/api";
import { hc } from "hono/client";
import { obsidianFetch } from "./obsidian-fetch";

export function createKaneoClient(apiBase: string, apiKey: string) {
  return hc<AppType>(apiBase, {
    fetch: obsidianFetch,
    headers: { "x-api-key": apiKey },
  });
}

export type KaneoClient = ReturnType<typeof createKaneoClient>;
