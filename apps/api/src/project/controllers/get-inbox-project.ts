import { and, eq } from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { findProjectKeyConflict } from "../project-key";
import {
  DEFAULT_PROJECT_COLUMNS,
  insertUnplacedProject,
} from "./insert-project";
import { lockProjectOrdering } from "./project-placement";

// A private inbox has no review step, so the global board never asks whether
// a task goes to In Progress or In Review.
const INBOX_COLUMNS = DEFAULT_PROJECT_COLUMNS.filter(
  (column) => column.slug !== "in-review",
).map((column, position) => ({ ...column, position }));

function findInbox(
  database: Pick<typeof db, "select">,
  workspaceId: string,
  userId: string,
) {
  return database
    .select()
    .from(projectTable)
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        eq(projectTable.inboxOwnerId, userId),
      ),
    )
    .limit(1)
    .then(([project]) => project);
}

// The caller's private inbox in a workspace, made on first use. It takes the
// first free key of INBOX, INBOX2, INBOX3, …
async function getInboxProject(workspaceId: string, userId: string) {
  const existing = await findInbox(db, workspaceId, userId);
  if (existing) return existing;

  return db.transaction(async (tx) => {
    // The same lock project creation takes, so no other project grabs the key.
    await lockProjectOrdering(tx, workspaceId);
    const raced = await findInbox(tx, workspaceId, userId);
    if (raced) return raced;

    let slug = "INBOX";
    for (let n = 2; await findProjectKeyConflict(tx, workspaceId, slug); n++)
      slug = `INBOX${n}`;
    const created = await insertUnplacedProject(
      tx,
      {
        workspaceId,
        name: "Inbox",
        icon: "Lightbulb",
        slug,
        userId,
      },
      INBOX_COLUMNS,
    );
    if (!created) throw new Error("Inbox project insert returned no row");
    const [inbox] = await tx
      .update(projectTable)
      .set({ inboxOwnerId: userId })
      .where(eq(projectTable.id, created.id))
      .returning();
    return inbox;
  });
}

export default getInboxProject;
