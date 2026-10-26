import { z } from "../openapi";
import { focusStateBody } from "./schema";

export const focusSessionSchema = focusStateBody
  .extend({
    taskId: z.string(),
    projectId: z.string(),
    workspaceId: z.string(),
    version: z.number(),
  })
  .openapi("FocusSession");

export const focusSessionResultSchema = z
  .object({
    session: focusSessionSchema.nullable(),
    recordedTaskId: z.string().nullable().openapi({
      description: "The task that this change recorded focus time on, if any.",
    }),
  })
  .openapi("FocusSessionResult");
