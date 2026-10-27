import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function getInboxProject(workspaceId: string) {
  const response = await client.project.inbox.$get({
    query: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getInboxProject;
