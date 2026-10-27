import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function getTaskTimeTotals(workspaceId: string, from: Date, to: Date) {
  const response = await client["time-entry"]["task-totals"].$get({
    query: { workspaceId, from: from.toISOString(), to: to.toISOString() },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getTaskTimeTotals;
