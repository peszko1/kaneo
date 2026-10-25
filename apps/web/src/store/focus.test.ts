import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { DEFAULT_FOCUS_SETTINGS } from "@/components/focus/focus-timer";
import { useFocusStore } from "./focus";
import { useFocusSettingsStore } from "./focus-settings";

const recordFocusSegment = vi.hoisted(() => vi.fn());
vi.mock("@/components/focus/record-focus-time", () => ({
  recordFocusSegment,
}));
const showPhaseEndedNotification = vi.hoisted(() => vi.fn());
vi.mock("@/components/focus/focus-notification", () => ({
  showPhaseEndedNotification,
}));

const task = { taskId: "t1", projectId: "p1", workspaceId: "w1" };
const FOCUS_MS = DEFAULT_FOCUS_SETTINGS.focusMinutes * 60_000;

describe("focus store alarm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    recordFocusSegment.mockClear();
    showPhaseEndedNotification.mockClear();
    useFocusSettingsStore.getState().resetSettings();
    useFocusStore.setState(useFocusStore.getInitialState());
    useFocusStore.getState().focusOn(task);
    useFocusStore.getState().closeView();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rings and opens the view when a phase runs out", () => {
    vi.setSystemTime(FOCUS_MS - 1);
    useFocusStore.getState().settle();
    expect(useFocusStore.getState().alarm).toBe(false);

    vi.setSystemTime(FOCUS_MS);
    useFocusStore.getState().settle();
    expect(useFocusStore.getState().alarm).toBe(true);
    expect(useFocusStore.getState().viewOpen).toBe(true);
    expect(useFocusStore.getState().session?.phase).toBe("shortBreak");
  });

  it("rings from the phase end even when the check runs late", () => {
    vi.setSystemTime(FOCUS_MS + 40_000);
    useFocusStore.getState().settle();
    expect(useFocusStore.getState().alarmAt).toBe(FOCUS_MS);

    useFocusStore.getState().stopAlarm();
    expect(useFocusStore.getState().alarmAt).toBeNull();
  });

  it("does not ring when the user skips a phase", () => {
    useFocusStore.getState().skip();
    expect(useFocusStore.getState().alarm).toBe(false);
  });

  it("stops ringing on stopAlarm or when the next phase starts", () => {
    vi.setSystemTime(FOCUS_MS);
    useFocusStore.getState().settle();
    useFocusStore.getState().stopAlarm();
    expect(useFocusStore.getState().alarm).toBe(false);

    useFocusStore.setState({ alarm: true });
    useFocusStore.getState().resume();
    expect(useFocusStore.getState().alarm).toBe(false);
  });

  it("records the focus round when it runs out, not the break", () => {
    vi.setSystemTime(FOCUS_MS + 5_000);
    useFocusStore.getState().settle();
    expect(recordFocusSegment).toHaveBeenCalledWith({
      taskId: "t1",
      startTime: 0,
      endTime: FOCUS_MS,
    });

    useFocusStore.getState().resume();
    vi.setSystemTime(FOCUS_MS + 120_000);
    useFocusStore.getState().skip();
    expect(recordFocusSegment).toHaveBeenCalledTimes(1);
  });

  it("splits the time when focus moves to another task", () => {
    vi.setSystemTime(300_000);
    useFocusStore.getState().focusOn({ ...task, taskId: "t2" });
    vi.setSystemTime(500_000);
    useFocusStore.getState().stop();
    expect(recordFocusSegment.mock.calls).toEqual([
      [{ taskId: "t1", startTime: 0, endTime: 300_000 }],
      [{ taskId: "t2", startTime: 300_000, endTime: 500_000 }],
    ]);
  });

  it("restarts paused in the new mode and records the time so far", () => {
    vi.setSystemTime(300_000);
    useFocusStore.getState().switchMode("flowtime");
    const { session } = useFocusStore.getState();
    expect(session?.mode).toBe("flowtime");
    expect(session?.runningSince).toBeNull();
    expect(session?.durationMs).toBeNull();
    expect(useFocusSettingsStore.getState().settings.mode).toBe("flowtime");
    expect(recordFocusSegment).toHaveBeenCalledWith({
      taskId: "t1",
      startTime: 0,
      endTime: 300_000,
    });
  });

  it("starts the next phase from now when auto-start is on", () => {
    useFocusSettingsStore.getState().changeSettings({ autoStartNext: true });
    vi.setSystemTime(FOCUS_MS + 30_000);
    useFocusStore.getState().settle();
    const { session } = useFocusStore.getState();
    expect(session?.phase).toBe("shortBreak");
    expect(session?.runningSince).toBe(FOCUS_MS + 30_000);
  });

  it("stays silent with sound off and notifies only when enabled", () => {
    useFocusSettingsStore
      .getState()
      .changeSettings({ sound: false, desktopNotifications: true });
    vi.setSystemTime(FOCUS_MS);
    useFocusStore.getState().settle();
    expect(useFocusStore.getState().alarm).toBe(false);
    expect(showPhaseEndedNotification).toHaveBeenCalledTimes(1);
  });
});
