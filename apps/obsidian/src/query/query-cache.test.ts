import { describe, expect, it, vi } from "vite-plus/test";
import { QueryCache } from "./query-cache";

describe("QueryCache", () => {
  it("runs identical requests in flight once", async () => {
    const cache = new QueryCache<number>();
    const load = vi.fn().mockResolvedValue(1);
    const [a, b] = await Promise.all([
      cache.get("k", 1000, load),
      cache.get("k", 1000, load),
    ]);
    expect([a, b]).toEqual([1, 1]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reuses a fresh result and reloads a stale one", async () => {
    let now = 0;
    const cache = new QueryCache<number>(() => now);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    await cache.get("k", 1000, load);
    now = 999;
    expect(await cache.get("k", 1000, load)).toBe(1);
    now = 1000;
    expect(await cache.get("k", 1000, load)).toBe(2);
  });

  it("does not keep failures", async () => {
    const cache = new QueryCache<number>();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(3);
    await expect(cache.get("k", 1000, load)).rejects.toThrow("offline");
    expect(await cache.get("k", 1000, load)).toBe(3);
  });

  it("reloads after clear", async () => {
    const cache = new QueryCache<number>();
    const load = vi.fn().mockResolvedValue(1);
    await cache.get("k", 1000, load);
    cache.clear();
    await cache.get("k", 1000, load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
