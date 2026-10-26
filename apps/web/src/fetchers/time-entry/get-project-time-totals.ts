import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function getProjectTimeTotals(workspaceId: string) {
  const response = await client["time-entry"]["project-totals"].$get({
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getProjectTimeTotals;
