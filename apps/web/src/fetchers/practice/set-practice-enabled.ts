import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

// Only switches the tab. The tracker page saves everything else itself, so a
// version conflict here is retried on the stored document.
async function setPracticeEnabled({
  enabled,
  version,
}: {
  enabled: boolean;
  version: number;
}) {
  let response = await client.practice.$put({ json: { version, enabled } });
  if (response.status === 409) {
    const stored = await response.json();
    response = await client.practice.$put({
      json: { version: stored.version, enabled },
    });
  }
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export default setPracticeEnabled;
