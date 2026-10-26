import { onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { OfflineError } from "@/lib/offline/offline-error";
import queryClient from "./index";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock("@sentry/react", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { error: toastError } }));

afterEach(() => {
  onlineManager.setOnline(true);
  vi.clearAllMocks();
});

const run = (options: {
  mutationFn: () => Promise<unknown>;
  onMutate?: () => void;
  meta?: Record<string, unknown>;
  networkMode?: "always";
}) =>
  queryClient.getMutationCache().build(queryClient, options).execute(undefined);

describe("offline mutation guard", () => {
  it("rejects a change offline before the optimistic update and the request", async () => {
    onlineManager.setOnline(false);
    const mutationFn = vi.fn(async () => "saved");
    const onMutate = vi.fn();

    await expect(run({ mutationFn, onMutate })).rejects.toBeInstanceOf(
      OfflineError,
    );
    expect(onMutate).not.toHaveBeenCalled();
    expect(mutationFn).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledOnce();
  });

  it("lets a change that queues itself run offline", async () => {
    onlineManager.setOnline(false);
    const mutationFn = vi.fn(async () => null);

    await expect(
      run({ mutationFn, meta: { queuesOffline: true }, networkMode: "always" }),
    ).resolves.toBeNull();
    expect(mutationFn).toHaveBeenCalledOnce();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("lets a change through online", async () => {
    await expect(run({ mutationFn: async () => "saved" })).resolves.toBe(
      "saved",
    );
    expect(toastError).not.toHaveBeenCalled();
  });
});
