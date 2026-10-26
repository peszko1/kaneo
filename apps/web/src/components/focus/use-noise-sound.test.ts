import { act, cleanup, renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { useFocusStore } from "@/store/focus";
import { useFocusSettingsStore } from "@/store/focus-settings";
import { useNoiseSound } from "./use-noise-sound";

const { startNoiseSound, stop } = vi.hoisted(() => {
  const stop = vi.fn();
  return { stop, startNoiseSound: vi.fn(() => ({ setVolume: vi.fn(), stop })) };
});
vi.mock("./noise-sound", () => ({ startNoiseSound }));
vi.mock("@/components/focus/focus-outbox", () => ({
  queueFocusChange: vi.fn(),
}));

type Grant = () => Promise<void> | undefined;

const task = { taskId: "t1", projectId: "p1", workspaceId: "w1" };
let waiting: Grant[] = [];

beforeEach(() => {
  waiting = [];
  vi.clearAllMocks();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    // Holds every request, so a test decides when the lock is granted.
    value: {
      request: (_name: string, _options: unknown, grant: Grant) => {
        waiting.push(grant);
        return new Promise(() => {});
      },
    },
  });
  useFocusSettingsStore.getState().resetSettings();
  useFocusSettingsStore.getState().changeSettings({ noise: "brown" });
  useFocusStore.setState(useFocusStore.getInitialState());
  useFocusStore.getState().focusOn(task);
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "locks");
});

describe("useNoiseSound", () => {
  it("plays once the tab gets the lock, and stops on pause", () => {
    renderHook(() => useNoiseSound());
    expect(startNoiseSound).not.toHaveBeenCalled();

    act(() => {
      waiting.at(-1)?.();
    });
    expect(startNoiseSound).toHaveBeenCalledWith("brown", 0.5, null);

    act(() => useFocusStore.getState().pause());
    expect(stop).toHaveBeenCalled();
  });

  it("plays nothing for a request granted after its effect ended", () => {
    const { unmount } = renderHook(() => useNoiseSound());
    unmount();

    for (const grant of waiting) grant();
    expect(startNoiseSound).not.toHaveBeenCalled();
  });

  it("plays nothing with noise off", () => {
    useFocusSettingsStore.getState().changeSettings({ noise: "off" });
    renderHook(() => useNoiseSound());
    expect(waiting).toHaveLength(0);
  });
});
