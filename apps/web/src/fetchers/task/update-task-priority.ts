import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";
import type Task from "@/types/task";

type UpdateTaskPriorityValue = InferRequestType<
  (typeof client)["task"]["priority"][":id"]["$put"]
>["json"]["priority"];

// `expected` is the priority an offline edit saw; see the API route.
async function updateTaskPriority(
  taskId: string,
  task: Task,
  expected?: string,
) {
  const response = await client.task.priority[":id"].$put({
    param: { id: taskId },
    json: {
      priority: (task.priority || "") as UpdateTaskPriorityValue,
      expected,
    },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  const data = await response.json();

  return data;
}

export default updateTaskPriority;
