import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { HttpError } from "@/lib/http-error";
import { clearEdits, queuedEdits, queueEdit } from "./edit-outbox";
import { replayEdits } from "./replay-edits";

const { sendTaskEdit, toastError } = vi.hoisted(() => ({
  sendTaskEdit: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("./saved-session", () => ({ savedSessionUserId: () => "user-1" }));
vi.mock("./send-task-edit", () => ({ sendTaskEdit }));
vi.mock("@/lib/toast", () => ({ toast: { error: toastError } }));
vi.mock("i18next", () => ({ default: { t: (key: string) => key } }));
vi.mock("@/query-client", () => ({
  default: { invalidateQueries: vi.fn() },
}));

const status = (taskId: string, value = "done") => ({
  kind: "status" as const,
  taskId,
  projectId: "p1",
  status: value,
});
const queuedIds = () =>
  queuedEdits().map((edit) => ("taskId" in edit ? edit.taskId : null));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  clearEdits();
  Reflect.deleteProperty(navigator, "locks");
});

describe("replayEdits", () => {
  it("sends edits oldest first and removes each one", async () => {
    sendTaskEdit.mockResolvedValue({});
    queueEdit(status("t1"));
    queueEdit(status("t2"));

    await replayEdits();

    expect(sendTaskEdit.mock.calls.map(([edit]) => edit.taskId)).toEqual([
      "t1",
      "t2",
    ]);
    expect(queuedIds()).toEqual([]);
  });

  it("keeps the edit and the ones after it when the server is away", async () => {
    sendTaskEdit
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    queueEdit(status("t1"));
    queueEdit(status("t2"));
    queueEdit(status("t3"));

    await replayEdits();

    expect(sendTaskEdit).toHaveBeenCalledTimes(2);
    expect(queuedIds()).toEqual(["t2", "t3"]);
  });

  it("keeps edits the server refuses for now", async () => {
    sendTaskEdit.mockRejectedValue(new HttpError(503, "Unavailable"));
    queueEdit(status("t1"));

    await replayEdits();

    expect(queuedIds()).toEqual(["t1"]);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("drops an edit the server rejects and goes on", async () => {
    sendTaskEdit
      .mockRejectedValueOnce(new HttpError(404, "Not found"))
      .mockResolvedValueOnce({});
    queueEdit(status("t1"));
    queueEdit(status("t2"));

    await replayEdits();

    expect(queuedIds()).toEqual([]);
    expect(toastError).toHaveBeenCalledOnce();
  });

  it("says when someone else changed the same thing first", async () => {
    sendTaskEdit
      .mockRejectedValueOnce(new HttpError(409, "Changed"))
      .mockResolvedValueOnce({});
    queueEdit(status("t1"));
    queueEdit(status("t2"));

    await replayEdits();

    expect(queuedIds()).toEqual([]);
    expect(toastError).toHaveBeenCalledWith("common:offline.editsConflicted");
  });

  it("leaves the queue to the tab that holds the lock", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: (
          _name: string,
          _options: unknown,
          send: (lock: null) => unknown,
        ) => Promise.resolve(send(null)),
      },
    });
    queueEdit(status("t1"));

    await replayEdits();

    expect(sendTaskEdit).not.toHaveBeenCalled();
    expect(queuedIds()).toEqual(["t1"]);
  });
});
