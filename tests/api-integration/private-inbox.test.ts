import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";

type User = { id: string; name: string; email: string };

function as(user: User) {
  const { app } = createApp();
  // The session mock is shared, so each request sets its own user.
  const json = (method: string, path: string, body?: unknown) => {
    mockAuthenticatedSession(user as never);
    return app.request(`/api${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };
  return {
    inbox: async (workspaceId: string) => {
      const response = await json(
        "GET",
        `/project/inbox?workspaceId=${workspaceId}`,
      );
      expect(response.status).toBe(200);
      return (await response.json()) as {
        id: string;
        slug: string;
        isInbox: boolean;
      };
    },
    json,
  };
}

async function backlogTitles(client: ReturnType<typeof as>) {
  const response = await client.json(
    "GET",
    "/task/global-board?globalStatus=backlog",
  );
  const body = (await response.json()) as { tasks: { title: string }[] };
  return body.tasks.map((task) => task.title);
}

beforeEach(resetTestDatabase);

describe("private inbox", () => {
  it("is made once per member and seen by its owner alone", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const member = await addWorkspaceMember(workspace.id);
    // An instance admin sees every project, but not someone's inbox.
    await db
      .update(schema.userTable)
      .set({ role: "admin" })
      .where(eq(schema.userTable.id, owner.id));

    const mine = as(member);
    const inbox = await mine.inbox(workspace.id);
    expect(inbox).toMatchObject({ slug: "INBOX", isInbox: true });
    expect((await mine.inbox(workspace.id)).id).toBe(inbox.id);
    // No review step, so the global board never asks which column to use.
    const columns = await db
      .select({ slug: schema.columnTable.slug })
      .from(schema.columnTable)
      .where(eq(schema.columnTable.projectId, inbox.id))
      .orderBy(schema.columnTable.position);
    expect(columns.map((column) => column.slug)).toEqual([
      "to-do",
      "in-progress",
      "done",
    ]);
    expect((await as(owner).inbox(workspace.id)).slug).toBe("INBOX2");

    const created = await mine.json("POST", `/task/${inbox.id}`, {
      title: "Secret idea",
      description: "",
      priority: "low",
      status: "planned",
    });
    expect(created.status).toBe(200);
    const task = (await created.json()) as { id: string };

    // The owner finds it on the global board and outside project lists.
    expect(await backlogTitles(as(member))).toEqual(["Secret idea"]);
    const listed = await as(member).json(
      "GET",
      `/project?workspaceId=${workspace.id}`,
    );
    expect(
      ((await listed.json()) as { id: string }[]).map((project) => project.id),
    ).not.toContain(inbox.id);

    // Nobody else reaches it, the workspace owner and instance admin included.
    const admin = as(owner);
    expect(await backlogTitles(admin)).toEqual([]);
    expect((await admin.json("GET", `/task/${task.id}`)).status).toBe(403);
    expect((await admin.json("GET", `/project/${inbox.id}`)).status).toBe(403);
    expect(
      (
        await admin.json("POST", `/task/${inbox.id}`, {
          title: "Planted",
          description: "",
          priority: "low",
          status: "planned",
        })
      ).status,
    ).toBe(403);
  });

  it("refuses to make an inbox public", async () => {
    const { user, workspace } = await createWorkspaceMember({ role: "owner" });
    const inbox = await as(user).inbox(workspace.id);
    const response = await as(user).json("PUT", `/project/${inbox.id}`, {
      name: "Inbox",
      icon: "Lightbulb",
      slug: inbox.slug,
      description: "",
      isPublic: true,
    });
    expect(response.status).toBe(400);
  });

  it("moves an idea from the inbox into a project", async () => {
    const { user, workspace } = await createWorkspaceMember({ role: "owner" });
    const project = await createProjectFixture({
      workspaceId: workspace.id,
      slug: "web",
    });
    const client = as(user);
    const inbox = await client.inbox(workspace.id);
    const task = (await (
      await client.json("POST", `/task/${inbox.id}`, {
        title: "Idea",
        description: "",
        priority: "low",
        status: "planned",
      })
    ).json()) as { id: string };

    const moved = await client.json("PUT", `/task/move/${task.id}`, {
      destinationProjectId: project.project.id,
    });
    expect(moved.status).toBe(200);
    const [row] = await db
      .select({
        projectId: schema.taskTable.projectId,
        status: schema.taskTable.status,
      })
      .from(schema.taskTable)
      .where(eq(schema.taskTable.id, task.id));
    // An idea lands in the project's backlog.
    expect(row).toEqual({ projectId: project.project.id, status: "planned" });
  });
});
