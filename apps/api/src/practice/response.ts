import { z } from "../openapi";

export const practiceSchema = z
  .object({
    enabled: z.boolean(),
    config: z.string().nullable(),
    state: z.record(z.string(), z.unknown()).nullable(),
    version: z.number().openapi({ description: "0 until the first save." }),
  })
  .openapi("Practice");
