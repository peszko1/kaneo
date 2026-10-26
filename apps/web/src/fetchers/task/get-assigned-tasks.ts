import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type AssignedTasks = InferResponseType<
  (typeof client)["task"]["assigned"]["$get"],
  200
>;

export type AssignedTask = AssignedTasks["tasks"][number];

export type AssignedTasksOrder = "due" | "board";

async function getAssignedTasks(
  workspaceId: string,
  countOnly = false,
  order: AssignedTasksOrder = "due",
) {
  const response = await client.task.assigned.$get({
    query: { workspaceId, countOnly: countOnly ? "true" : "false", order },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getAssignedTasks;
