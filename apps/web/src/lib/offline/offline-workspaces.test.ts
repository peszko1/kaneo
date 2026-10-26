import { atom } from "nanostores";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  keepWorkspacesOffline,
  removeSavedWorkspaces,
} from "./offline-workspaces";

const { atoms, userId } = vi.hoisted(() => ({
  atoms: { current: {} as Record<string, unknown> },
  userId: { current: "user-1" },
}));
vi.mock("../auth-client", () => ({
  authClient: {
    $store: {
      get atoms() {
        return atoms.current;
      },
    },
  },
}));
vi.mock("./saved-session", () => ({
  savedSessionUserId: () => userId.current,
}));

type Value = {
  data: unknown;
  error: { status?: number } | null;
  isPending: boolean;
};
const idle: Value = { data: null, error: null, isPending: false };
const workspaces = [{ id: "ws-1", name: "Team" }];

function start() {
  const list = atom<Value>({ ...idle, isPending: true });
  const active = atom<Value>({ ...idle, isPending: true });
  atoms.current = { listOrganizations: list, activeOrganization: active };
  keepWorkspacesOffline();
  return list;
}

beforeEach(() => {
  localStorage.clear();
  userId.current = "user-1";
});

describe("keepWorkspacesOffline", () => {
  it("shows the saved workspaces when the server is out of reach", () => {
    start().set({ ...idle, data: workspaces });

    const list = start();
    list.set({ ...idle, error: {} });
    expect(list.get()).toMatchObject({ data: workspaces, error: null });
  });

  it("keeps a refusal from the server as an error", () => {
    start().set({ ...idle, data: workspaces });

    const list = start();
    list.set({ ...idle, error: { status: 403 } });
    expect(list.get().data).toBeNull();
  });

  it("never shows another user's workspaces", () => {
    start().set({ ...idle, data: workspaces });
    userId.current = "user-2";

    const list = start();
    list.set({ ...idle, error: {} });
    expect(list.get().data).toBeNull();
  });

  it("forgets the saved workspaces on sign-out", () => {
    start().set({ ...idle, data: workspaces });
    removeSavedWorkspaces();

    const list = start();
    list.set({ ...idle, error: {} });
    expect(list.get().data).toBeNull();
  });
});
