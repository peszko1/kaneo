import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { habitsKey } from "@/hooks/queries/habit/use-get-habits";
import useReorderHabits from "./use-reorder-habits";

const reorder = vi.hoisted(() => vi.fn());
vi.mock("@/fetchers/habit/reorder-habits", () => ({ default: reorder }));

afterEach(cleanup);

const habit = (id: string) => ({
  id,
  name: id,
  createdAt: "2026-10-01T00:00:00.000Z",
  doneCount: 0,
  checks: [],
});

describe("useReorderHabits", () => {
  it("shows the new order before the server answers", async () => {
    const queryClient = new QueryClient();
    const key = habitsKey({ from: "2026-10-01", to: "2026-10-26" });
    queryClient.setQueryData(key, [habit("a"), habit("b"), habit("c")]);
    let finish = () => {};
    reorder.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ ids: [] });
      }),
    );
    const { result } = renderHook(() => useReorderHabits(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    act(() => result.current.mutate(["c", "a", "b"]));
    await vi.waitFor(() =>
      expect(
        queryClient
          .getQueryData<Array<{ id: string }>>(key)
          ?.map((item) => item.id),
      ).toEqual(["c", "a", "b"]),
    );
    expect(reorder).toHaveBeenCalledWith(["c", "a", "b"], expect.anything());
    finish();
  });
});
