import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type Task from "@/types/task";

// `expected` is the due date an offline edit saw; see the API route.
async function updateTaskDueDate(
  taskId: string,
  task: Task,
  expected?: string | null,
) {
  const response = await client.task["due-date"][":id"].$put({
    param: { id: taskId },
    json: {
      dueDate: task.dueDate || "",
      expected,
    },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  const data = await response.json();

  return data;
}

export default updateTaskDueDate;
