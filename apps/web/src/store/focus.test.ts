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

const queueFocusChange = vi.hoisted(() => vi.fn());
vi.mock("@/components/focus/focus-outbox", () => ({ queueFocusChange }));
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
    showPhaseEndedNotification.mockClear();
    useFocusSettingsStore.getState().resetSettings();
    useFocusStore.setState(useFocusStore.getInitialState());
    useFocusStore.getState().focusOn(task);
    useFocusStore.getState().closeView();
    queueFocusChange.mockClear();
  });

  const queued = () =>
    queueFocusChange.mock.calls.map(([change]) => ({
      at: change.at,
      taskId: change.next?.taskId ?? null,
      phase: change.next?.phase ?? null,
      runningSince: change.next?.runningSince ?? null,
    }));

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
    expect(useFocusStore.getState().session).toMatchObject({
      phase: "focus",
      durationMs: null,
      runningSince: 0,
    });
  });

  it("rings once when focus runs into overtime", () => {
    vi.setSystemTime(FOCUS_MS);
    useFocusStore.getState().settle();
    useFocusStore.getState().stopAlarm();
    queueFocusChange.mockClear();

    vi.setSystemTime(FOCUS_MS * 3);
    useFocusStore.getState().settle();
    expect(useFocusStore.getState().alarm).toBe(false);
    expect(queueFocusChange).not.toHaveBeenCalled();
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

  it("shares the phase end with the time it happened", () => {
    vi.setSystemTime(FOCUS_MS + 5_000);
    useFocusStore.getState().settle();
    expect(queued()).toEqual([
      {
        at: FOCUS_MS + 5_000,
        taskId: "t1",
        phase: "focus",
        runningSince: 0,
      },
    ]);
    expect(queueFocusChange.mock.calls[0]?.[0].next.alarmAt).toBe(FOCUS_MS);
  });

  it("restarts the clock on the new task and shares the stop", () => {
    vi.setSystemTime(300_000);
    useFocusStore.getState().focusOn({ ...task, taskId: "t2" });
    vi.setSystemTime(500_000);
    useFocusStore.getState().stop();
    expect(queued()).toEqual([
      { at: 300_000, taskId: "t2", phase: "focus", runningSince: 300_000 },
      { at: 500_000, taskId: null, phase: null, runningSince: null },
    ]);
  });

  it("shares nothing when focus opens on the same task", () => {
    useFocusStore.getState().focusOn(task);
    expect(queueFocusChange).not.toHaveBeenCalled();
  });

  it("shows the timer another device saved, and rings there too", () => {
    useFocusStore.getState().showServerSession({
      ...task,
      mode: "pomodoro",
      phase: "shortBreak",
      completedFocusRounds: 1,
      durationMs: 300_000,
      elapsedMs: 0,
      runningSince: null,
      alarmAt: FOCUS_MS,
      version: 3,
    });
    const state = useFocusStore.getState();
    expect(state.session?.phase).toBe("shortBreak");
    expect(state.alarm).toBe(true);
    expect(state.viewOpen).toBe(true);
    expect(queueFocusChange).not.toHaveBeenCalled();

    useFocusStore.getState().showServerSession(null);
    expect(useFocusStore.getState().session).toBeNull();
  });

  it("restarts paused in the new mode and shares the change", () => {
    vi.setSystemTime(300_000);
    useFocusStore.getState().switchMode("flowtime");
    const { session } = useFocusStore.getState();
    expect(session?.mode).toBe("flowtime");
    expect(session?.runningSince).toBeNull();
    expect(session?.durationMs).toBeNull();
    expect(useFocusSettingsStore.getState().settings.mode).toBe("flowtime");
    expect(queued()).toEqual([
      { at: 300_000, taskId: "t1", phase: "focus", runningSince: null },
    ]);
  });

  it("starts the next phase from now when auto-start is on", () => {
    useFocusSettingsStore.getState().changeSettings({ autoStartNext: true });
    vi.setSystemTime(FOCUS_MS + 30_000);
    useFocusStore.getState().settle();
    const { session } = useFocusStore.getState();
    expect(session?.phase).toBe("shortBreak");
    expect(session?.runningSince).toBe(FOCUS_MS + 30_000);
  });

  it("applies a new length to the phase that waits to start", () => {
    vi.setSystemTime(FOCUS_MS);
    useFocusStore.getState().settle();
    useFocusStore.getState().skip();
    useFocusSettingsStore.getState().changeSettings({ shortBreakMinutes: 1 });
    expect(useFocusStore.getState().session?.durationMs).toBe(60_000);
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
