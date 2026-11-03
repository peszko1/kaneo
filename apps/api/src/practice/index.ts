import { apiRouter, createRoute, jsonResponse } from "../openapi";
import { readPractice, savePractice } from "./controllers/practice-document";
import { practiceSchema } from "./response";
import { practiceBody } from "./schema";

const getPracticeRoute = createRoute({
  method: "get",
  operationId: "getPractice",
  path: "/",
  tags: ["Practice"],
  summary: "Get the 120h tracker",
  description:
    "The caller's 120h practice tracker: whether the tab is on, the lessons YAML, and the tracker's own state.",
  responses: { 200: jsonResponse("The tracker document", practiceSchema) },
});

const savePracticeRoute = createRoute({
  method: "put",
  operationId: "savePractice",
  path: "/",
  tags: ["Practice"],
  summary: "Save the 120h tracker",
  description:
    "Replace the fields sent. Fails with 409 and the stored document when `version` is not the stored version.",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: practiceBody } },
    },
  },
  responses: {
    200: jsonResponse("The saved document", practiceSchema),
    409: jsonResponse(
      "The stored document, newer than `version`",
      practiceSchema,
    ),
  },
});

const practice = apiRouter()
  .openapi(getPracticeRoute, async (c) =>
    c.json(await readPractice(c.get("userId")), 200),
  )
  .openapi(savePracticeRoute, async (c) => {
    const result = await savePractice(c.get("userId"), c.req.valid("json"));
    return result.saved
      ? c.json(result.practice, 200)
      : c.json(result.practice, 409);
  });

export default practice;
