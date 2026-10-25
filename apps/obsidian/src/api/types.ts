import type { InferRequestType, InferResponseType } from "hono/client";
import type { KaneoClient } from "./client";

type BoardEndpoint = KaneoClient["task"]["global-board"]["$get"];

export type BoardTasksQuery = InferRequestType<BoardEndpoint>["query"];
export type BoardTasksPage = InferResponseType<BoardEndpoint, 200>;
export type BoardTask = BoardTasksPage["tasks"][number];

export type BoardMeta = InferResponseType<
  KaneoClient["task"]["global-board"]["meta"]["$get"],
  200
>;
export type BoardProject = BoardMeta["projects"][number];
export type BoardColumn = BoardProject["columns"][number];
