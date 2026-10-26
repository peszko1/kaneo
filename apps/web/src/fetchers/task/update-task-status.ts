import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type Task from "@/types/task";

type UpdateTaskStatusPayload = Pick<Task, "status">;

// `expected` is the status an offline edit saw; see the API route.
async function updateTaskStatus(
  taskId: string,
  task: UpdateTaskStatusPayload,
  expected?: string,
) {
  const response = await client.task.status[":id"].$put({
    param: { id: taskId },
    json: {
      status: task.status || "",
      expected,
    },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  const data = await response.json();

  return data;
}

export default updateTaskStatus;
