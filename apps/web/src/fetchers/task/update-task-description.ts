import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type Task from "@/types/task";

// `expected` is the description an offline edit saw; see the API route.
async function updateTaskDescription(
  taskId: string,
  task: Task,
  expected?: string | null,
) {
  const response = await client.task.description[":id"].$put({
    param: { id: taskId },
    json: {
      description: task.description || "",
      expected,
    },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  const data = await response.json();

  return data;
}

export default updateTaskDescription;
