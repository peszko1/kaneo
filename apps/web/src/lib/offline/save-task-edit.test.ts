import { onlineManager, QueryClient } from "@tanstack/react-query";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { clearEdits, queuedEdits } from "./edit-outbox";
import { saveTaskEdit } from "./save-task-edit";

const { sendTaskEdit, client } = vi.hoisted(() => ({
  sendTaskEdit: vi.fn(),
  client: { current: null as unknown },
}));
vi.mock("./saved-session", () => ({ savedSessionUserId: () => "user-1" }));
vi.mock("./task-edit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./task-edit")>()),
  sendTaskEdit,
}));
vi.mock("@/query-client", () => ({
  get default() {
    return client.current;
  },
}));

const edit = {
  kind: "status" as const,
  taskId: "t1",
  projectId: "p1",
  status: "done",
};
let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  clearEdits();
  queryClient = new QueryClient();
  client.current = queryClient;
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("saveTaskEdit", () => {
  it("sends the edit while online", async () => {
    sendTaskEdit.mockResolvedValue({ id: "t1" });
    await expect(saveTaskEdit(edit)).resolves.toEqual({ id: "t1" });
    expect(queuedEdits()).toEqual([]);
  });

  it("queues the edit offline and shows it on the task and the board", async () => {
    onlineManager.setOnline(false);
    queryClient.setQueryData(["task", "t1"], { id: "t1", status: "to-do" });
    queryClient.setQueryData(["tasks", "p1"], {
      id: "p1",
      columns: [
        {
          slug: "to-do",
          tasks: [{ id: "t1", projectId: "p1", status: "to-do" }],
        },
        { slug: "done", tasks: [] },
      ],
      plannedTasks: [],
      archivedTasks: [],
    });

    await expect(saveTaskEdit(edit)).resolves.toBeNull();

    expect(sendTaskEdit).not.toHaveBeenCalled();
    expect(queuedEdits()).toHaveLength(1);
    expect(queryClient.getQueryData(["task", "t1"])).toMatchObject({
      status: "done",
    });
    const board = queryClient.getQueryData<{
      columns: { slug: string; tasks: { id: string }[] }[];
    }>(["tasks", "p1"]);
    expect(board?.columns.map((column) => column.tasks.length)).toEqual([0, 1]);
  });
});
