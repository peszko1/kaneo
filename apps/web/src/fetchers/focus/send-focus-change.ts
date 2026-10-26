import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";
import type { FocusSessionResult } from "./get-focus-session";

export type FocusState = InferRequestType<
  (typeof client)["focus"]["session"]["$put"]
>["json"]["state"];

type FocusChangeRequest = {
  baseVersion: number | null;
  at: number;
  // The new timer, or null to stop it.
  next: (FocusState & { taskId: string }) | null;
};

// A 409 carries the stored timer, which the caller then shows instead.
async function sendFocusChange({
  baseVersion,
  at,
  next,
}: FocusChangeRequest): Promise<{
  conflict: boolean;
  result: FocusSessionResult;
}> {
  let response: Response;
  if (next) {
    response = await client.focus.session.$put({
      json: { taskId: next.taskId, baseVersion, at, state: toState(next) },
    });
  } else if (baseVersion === null) {
    // A timer the server never saw has nothing to stop there.
    return { conflict: false, result: { session: null, recordedTaskId: null } };
  } else {
    response = await client.focus.session.stop.$post({
      json: { baseVersion, at },
    });
  }

  if (response.status === 409 || response.ok) {
    return {
      conflict: response.status === 409,
      result: (await response.json()) as FocusSessionResult,
    };
  }
  throw await HttpError.fromResponse(response);
}

function toState(next: FocusState): FocusState {
  return {
    mode: next.mode,
    phase: next.phase,
    completedFocusRounds: next.completedFocusRounds,
    durationMs: next.durationMs,
    elapsedMs: next.elapsedMs,
    runningSince: next.runningSince,
    alarmAt: next.alarmAt,
  };
}

export default sendFocusChange;
