import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
import type Task from "@/types/task";

type UpdateTaskAssigneePayload = Pick<Task, "userId">;

// `expected` is the assignee an offline edit saw; see the API route.
async function updateTaskAssignee(
  taskId: string,
  task: UpdateTaskAssigneePayload,
  expected?: string | null,
) {
  const response = await client.task.assignee[":id"].$put({
    param: { id: taskId },
    json: {
      userId: task.userId || "",
      expected,
    },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  const data = await response.json();

  return data;
}

export default updateTaskAssignee;
