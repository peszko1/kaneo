import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";

export const timeEntrySchema = z
  .object({
    id: z.string(),
    taskId: z.string(),
    userId: z.string().nullable().openapi({
      description: "Null once the user who logged the time has been removed.",
    }),
    description: z.string().nullable(),
    startTime: responseTimestamp,
    endTime: nullableResponseTimestamp.openapi({
      description: "Null while the timer is still running.",
    }),
    duration: z.number().nullable().openapi({
      description: "Elapsed seconds, filled in once the entry has an endTime.",
    }),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("TimeEntry");

export const timeEntryListSchema = z.array(
  timeEntrySchema
    .extend({ userName: z.string().nullable() })
    .openapi("TimeEntryWithUser"),
);

export const timeSummarySchema = z
  .object({
    totalSeconds: z.number().openapi({
      description:
        "Seconds of finished time entries that started in the range.",
    }),
    entryCount: z.number(),
  })
  .openapi("TimeSummary");

export const projectTimeTotalsSchema = z
  .object({
    projects: z.array(
      z.object({
        projectId: z.string(),
        totalSeconds: z.number().openapi({
          description:
            "Seconds of finished time entries on the project's tasks, from every member.",
        }),
      }),
    ),
  })
  .openapi("ProjectTimeTotals");
