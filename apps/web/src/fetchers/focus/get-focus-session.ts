import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type FocusSessionResult = InferResponseType<
  (typeof client)["focus"]["session"]["$get"],
  200
>;
export type ServerFocusSession = NonNullable<FocusSessionResult["session"]>;

async function getFocusSession() {
  const response = await client.focus.session.$get();

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getFocusSession;
