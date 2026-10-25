import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { PHASE_DURATION_MS } from "@/components/focus/pomodoro";
import { useFocusStore } from "./focus";

const task = { taskId: "t1", projectId: "p1", workspaceId: "w1" };

describe("focus store alarm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    useFocusStore.setState(useFocusStore.getInitialState());
    useFocusStore.getState().focusOn(task);
    useFocusStore.getState().closeView();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rings and opens the view when a phase runs out", () => {
    vi.setSystemTime(PHASE_DURATION_MS.focus - 1);
    useFocusStore.getState().settle();
    expect(useFocusStore.getState().alarm).toBe(false);

    vi.setSystemTime(PHASE_DURATION_MS.focus);
    useFocusStore.getState().settle();
    expect(useFocusStore.getState().alarm).toBe(true);
    expect(useFocusStore.getState().viewOpen).toBe(true);
    expect(useFocusStore.getState().session?.phase).toBe("shortBreak");
  });

  it("does not ring when the user skips a phase", () => {
    useFocusStore.getState().skip();
    expect(useFocusStore.getState().alarm).toBe(false);
  });

  it("stops ringing on stopAlarm or when the next phase starts", () => {
    vi.setSystemTime(PHASE_DURATION_MS.focus);
    useFocusStore.getState().settle();
    useFocusStore.getState().stopAlarm();
    expect(useFocusStore.getState().alarm).toBe(false);

    useFocusStore.setState({ alarm: true });
    useFocusStore.getState().resume();
    expect(useFocusStore.getState().alarm).toBe(false);
  });
});
