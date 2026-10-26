import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { canLogTime } from "./controllers/can-log-time";
import { changeFocusSession } from "./controllers/change-focus-session";
import { readFocusSession } from "./controllers/read-focus-session";
import { focusSessionResultSchema } from "./response";
import { saveFocusSessionBody, stopFocusSessionBody } from "./schema";

const getFocusSessionRoute = createRoute({
  method: "get",
  operationId: "getFocusSession",
  path: "/session",
  tags: ["Focus"],
  summary: "Get my focus timer",
  description:
    "The caller's focus timer, shared by all their devices, or null when none is running.",
  responses: {
    200: jsonResponse("The focus timer", focusSessionResultSchema),
  },
});

const saveFocusSessionRoute = createRoute({
  method: "put",
  operationId: "saveFocusSession",
  path: "/session",
  tags: ["Focus"],
  summary: "Change my focus timer",
  description:
    "Start or change the caller's focus timer. When the change ends running focus time, that time is recorded as a time entry on the task, once, even when several devices send the same change.",
  middleware: [
    workspaceAccess.fromTaskId(),
    requireWorkspacePermission({ task: ["update"] }),
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: saveFocusSessionBody } },
    },
  },
  responses: {
    200: jsonResponse("The changed timer", focusSessionResultSchema),
    400: errorResponse("Invalid timer"),
    403: errorResponse("No access to the task, or missing task:update"),
    404: errorResponse("Task not found"),
    409: jsonResponse(
      "The timer changed on another device; this is the stored one",
      focusSessionResultSchema,
    ),
  },
});

const stopFocusSessionRoute = createRoute({
  method: "post",
  operationId: "stopFocusSession",
  path: "/session/stop",
  tags: ["Focus"],
  summary: "Stop my focus timer",
  description:
    "Stop the caller's focus timer and record the running focus time it ends.",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: stopFocusSessionBody } },
    },
  },
  responses: {
    200: jsonResponse("The timer is stopped", focusSessionResultSchema),
    400: errorResponse("Invalid request"),
    409: jsonResponse(
      "The timer changed on another device; this is the stored one",
      focusSessionResultSchema,
    ),
  },
});

const focus = apiRouter()
  .openapi(getFocusSessionRoute, async (c) =>
    c.json(
      {
        session: await readFocusSession(c.get("userId")),
        recordedTaskId: null,
      },
      200,
    ),
  )
  .openapi(saveFocusSessionRoute, async (c) => {
    const { taskId, baseVersion, at, state } = c.req.valid("json");
    const { conflict, ...result } = await changeFocusSession({
      userId: c.get("userId"),
      baseVersion,
      at,
      next: { ...state, taskId },
      canLogTime: (id) => canLogTime(c, id),
    });
    return conflict ? c.json(result, 409) : c.json(result, 200);
  })
  .openapi(stopFocusSessionRoute, async (c) => {
    const { baseVersion, at } = c.req.valid("json");
    const { conflict, ...result } = await changeFocusSession({
      userId: c.get("userId"),
      baseVersion,
      at,
      next: null,
      canLogTime: (id) => canLogTime(c, id),
    });
    return conflict ? c.json(result, 409) : c.json(result, 200);
  });

export default focus;
