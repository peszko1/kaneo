import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type Practice = InferResponseType<
  (typeof client)["practice"]["$get"],
  200
>;

async function getPractice() {
  const response = await client.practice.$get();
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export default getPractice;
