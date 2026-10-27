import { afterEach, describe, expect, it, vi } from "vite-plus/test";

class FakeAudioContext {
  state = "suspended";
  close = vi.fn(async () => {
    this.state = "closed";
  });
}

describe("audio context", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function load() {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", FakeAudioContext);
    return import("./audio-context");
  }

  it("replaces an old context, closes it, and tells listeners", async () => {
    const { audioContext, replaceAudioContext, onAudioContextReplaced } =
      await load();
    const first = audioContext() as unknown as FakeAudioContext;
    const listener = vi.fn();
    onAudioContextReplaced(listener);

    vi.advanceTimersByTime(2000);
    const next = replaceAudioContext();

    expect(next).not.toBe(first);
    expect(audioContext()).toBe(next);
    expect(first.close).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps a context that a gesture made a moment ago", async () => {
    const { audioContext, replaceAudioContext } = await load();
    const first = audioContext();

    expect(replaceAudioContext()).toBe(first);
  });
});
