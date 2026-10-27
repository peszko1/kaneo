import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createTimeEntry from "./controllers/create-time-entry";
import getTimeEntriesByTaskId from "./controllers/get-time-entries";
import getProjectTimeTotals from "./controllers/get-project-time-totals";
import getTaskTimeTotals from "./controllers/get-task-time-totals";
import getTimeEntry from "./controllers/get-time-entry";
import getTimeSummary from "./controllers/get-time-summary";
import updateTimeEntry from "./controllers/update-time-entry";
import {
  projectTimeTotalsSchema,
  taskTimeTotalsSchema,
  timeEntryListSchema,
  timeEntrySchema,
  timeSummarySchema,
} from "./response";
import {
  createTimeEntryBody,
  projectTimeTotalsQuery,
  taskIdParam,
  timeEntryParam,
  timeSummaryQuery,
  updateTimeEntryBody,
} from "./schema";

const getTaskTimeEntriesRoute = createRoute({
  method: "get",
  operationId: "getTaskTimeEntries",
  path: "/task/{taskId}",
  tags: ["Time Entries"],
  summary: "Get task time entries",
  description: "Get every time entry logged against a task.",
  middleware: [workspaceAccess.fromTaskId()] as const,
  request: { params: taskIdParam },
  responses: {
    200: jsonResponse("List of time entries for the task", timeEntryListSchema),
    403: errorResponse("No access to the project"),
    404: errorResponse("Task not found"),
  },
});

const getTimeSummaryRoute = createRoute({
  method: "get",
  operationId: "getTimeSummary",
  path: "/summary",
  tags: ["Time Entries"],
  summary: "Get my time summary",
  description:
    "Total the caller's own finished time entries that started in a range, across the workspace's projects the caller can access. Running entries are not counted.",
  middleware: [
    workspaceAccess.fromQuery(),
    requireWorkspacePermission({ task: ["read"] }),
  ] as const,
  request: { query: timeSummaryQuery },
  responses: {
    200: jsonResponse(
      "The caller's tracked time in the range",
      timeSummarySchema,
    ),
    400: errorResponse("Invalid workspace ID or timestamps"),
    403: errorResponse("Missing task:read permission"),
    404: errorResponse("Workspace not found"),
  },
});

const getTaskTimeTotalsRoute = createRoute({
  method: "get",
  operationId: "getTaskTimeTotals",
  path: "/task-totals",
  tags: ["Time Entries"],
  summary: "Get my time per task",
  description:
    "Total the caller's own finished time entries that started in a range, per task, across the workspace's projects the caller can access. Tasks with the most time come first. Running entries are not counted.",
  middleware: [
    workspaceAccess.fromQuery(),
    requireWorkspacePermission({ task: ["read"] }),
  ] as const,
  request: { query: timeSummaryQuery },
  responses: {
    200: jsonResponse(
      "The caller's tracked time per task in the range",
      taskTimeTotalsSchema,
    ),
    400: errorResponse("Invalid workspace ID or timestamps"),
    403: errorResponse("Missing task:read permission"),
    404: errorResponse("Workspace not found"),
  },
});

const getProjectTimeTotalsRoute = createRoute({
  method: "get",
  operationId: "getProjectTimeTotals",
  path: "/project-totals",
  tags: ["Time Entries"],
  summary: "Get project time totals",
  description:
    "Total every member's finished time entries per project, across the workspace's projects the caller can access. Projects without tracked time are left out. Running entries are not counted.",
  middleware: [
    workspaceAccess.fromQuery(),
    requireWorkspacePermission({ task: ["read"] }),
  ] as const,
  request: { query: projectTimeTotalsQuery },
  responses: {
    200: jsonResponse("Tracked time per project", projectTimeTotalsSchema),
    400: errorResponse("Invalid workspace ID"),
    403: errorResponse("Missing task:read permission"),
    404: errorResponse("Workspace not found"),
  },
});

const getTimeEntryRoute = createRoute({
  method: "get",
  operationId: "getTimeEntry",
  path: "/{id}",
  tags: ["Time Entries"],
  summary: "Get time entry",
  description: "Get a single time entry by ID.",
  middleware: [workspaceAccess.fromTimeEntry()] as const,
  request: { params: timeEntryParam },
  responses: {
    200: jsonResponse("Time entry details", timeEntrySchema),
    403: errorResponse("No access to the project"),
    404: errorResponse("Time entry not found"),
  },
});

const createTimeEntryRoute = createRoute({
  method: "post",
  operationId: "createTimeEntry",
  path: "/",
  tags: ["Time Entries"],
  summary: "Create time entry",
  description:
    "Log time against a task. Omit endTime to start a running entry that can be closed later with an update.",
  middleware: [
    workspaceAccess.fromTaskId(),
    requireWorkspacePermission({ task: ["update"] }),
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createTimeEntryBody } },
    },
  },
  responses: {
    200: jsonResponse("The created time entry", timeEntrySchema),
    400: errorResponse("Invalid body or timestamps"),
    403: errorResponse(
      "No access to the project, or missing task:update permission",
    ),
    404: errorResponse("Task not found"),
  },
});

const updateTimeEntryRoute = createRoute({
  method: "put",
  operationId: "updateTimeEntry",
  path: "/{id}",
  tags: ["Time Entries"],
  summary: "Update time entry",
  description:
    "Replace a time entry's start, end, and description. Setting endTime closes a running entry and fills in its duration.",
  middleware: [
    workspaceAccess.fromTimeEntry(),
    requireWorkspacePermission({ task: ["update"] }),
  ] as const,
  request: {
    params: timeEntryParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateTimeEntryBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated time entry", timeEntrySchema),
    400: errorResponse("Invalid timestamps"),
    403: errorResponse(
      "No access to the project, or missing task:update permission",
    ),
    404: errorResponse("Time entry not found"),
  },
});

const timeEntry = apiRouter()
  .openapi(getTaskTimeEntriesRoute, async (c) =>
    c.json(await getTimeEntriesByTaskId(c.req.valid("param").taskId), 200),
  )
  .openapi(getTimeSummaryRoute, async (c) => {
    const { workspaceId, from, to } = c.req.valid("query");
    return c.json(
      await getTimeSummary({
        workspaceId,
        userId: c.get("userId"),
        from: new Date(from),
        to: new Date(to),
      }),
      200,
    );
  })
  .openapi(getTaskTimeTotalsRoute, async (c) => {
    const { workspaceId, from, to } = c.req.valid("query");
    return c.json(
      await getTaskTimeTotals({
        workspaceId,
        userId: c.get("userId"),
        from: new Date(from),
        to: new Date(to),
      }),
      200,
    );
  })
  .openapi(getProjectTimeTotalsRoute, async (c) =>
    c.json(
      await getProjectTimeTotals({
        workspaceId: c.req.valid("query").workspaceId,
        userId: c.get("userId"),
      }),
      200,
    ),
  )
  .openapi(getTimeEntryRoute, async (c) =>
    c.json(await getTimeEntry(c.req.valid("param").id), 200),
  )
  .openapi(createTimeEntryRoute, async (c) => {
    const { taskId, startTime, endTime, description } = c.req.valid("json");
    return c.json(
      await createTimeEntry({
        taskId,
        userId: c.get("userId"),
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        description,
      }),
      200,
    );
  })
  .openapi(updateTimeEntryRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { startTime, endTime, description } = c.req.valid("json");
    return c.json(
      await updateTimeEntry({
        timeEntryId: id,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        description,
      }),
      200,
    );
  });

export default timeEntry;
