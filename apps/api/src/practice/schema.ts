import { z } from "../openapi";

const MAX_CONFIG_LENGTH = 200_000;
const MAX_STATE_BYTES = 1_000_000;

export const practiceBody = z.object({
  version: z.number().int().min(0).openapi({
    description:
      "The document version this change was made on, 0 when the caller saw none. A different stored version returns 409 with the stored document.",
  }),
  enabled: z.boolean().optional().openapi({
    description: "Show the 120h tab to this user.",
  }),
  config: z.string().max(MAX_CONFIG_LENGTH).nullable().optional().openapi({
    description: "Lessons as YAML. Kaneo stores the text and never reads it.",
  }),
  state: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .refine(
      (state) => JSON.stringify(state ?? null).length <= MAX_STATE_BYTES,
      {
        message: "State is too large",
      },
    )
    .openapi({
      description:
        "The tracker's own JSON (logged time, timer, settings). Kaneo never reads it.",
    }),
});
