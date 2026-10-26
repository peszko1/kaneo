import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function reorderHabits(ids: string[]) {
  const response = await client.habit.order.$put({ json: { ids } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export default reorderHabits;
