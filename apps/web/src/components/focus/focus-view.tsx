import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Minimize2, Pause, Play, SkipForward, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import CircularProgress from "@/components/ui/circular-progress";
import useGetTask from "@/hooks/queries/task/use-get-task";
import { useFocusStore } from "@/store/focus";
import { formatCountdown } from "./format-countdown";
import {
  currentRound,
  FOCUS_ROUNDS_PER_LONG_BREAK,
  isRunning,
  PHASE_DURATION_MS,
  type PomodoroSession,
} from "./pomodoro";
import { usePomodoroClock } from "./use-pomodoro-clock";

export function FocusView() {
  const session = useFocusStore((state) => state.session);
  const viewOpen = useFocusStore((state) => state.viewOpen);
  const closeView = useFocusStore((state) => state.closeView);

  return (
    <DialogPrimitive.Root
      open={viewOpen && session !== null}
      onOpenChange={(open) => !open && closeView()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col bg-background outline-none transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0">
          {session && <FocusPanel session={session} />}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function FocusPanel({ session }: { session: PomodoroSession }) {
  const { t } = useTranslation();
  const { data: task } = useGetTask(session.taskId);
  const left = usePomodoroClock();
  const { pause, resume, skip, stop, closeView } = useFocusStore();
  const duration = PHASE_DURATION_MS[session.phase];
  const running = isRunning(session);
  const notStarted = !running && session.pausedRemainingMs === duration;

  return (
    <>
      <div className="flex justify-end p-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("tasks:focus.actions.minimize")}
          onClick={closeView}
          className="text-muted-foreground hover:text-foreground"
        >
          <Minimize2 />
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <DialogPrimitive.Title className="font-medium text-muted-foreground text-sm">
            {t(`tasks:focus.phase.${session.phase}`)}
            <span className="sr-only"> · {t("tasks:focus.title")}</span>
          </DialogPrimitive.Title>
          <p className="text-muted-foreground/80 text-xs">
            {t("tasks:focus.round", {
              current: currentRound(session),
              total: FOCUS_ROUNDS_PER_LONG_BREAK,
            })}
          </p>
        </div>

        <div className="relative grid place-items-center">
          <CircularProgress
            completed={duration - left}
            total={duration}
            size={280}
            strokeWidth={6}
          />
          <span
            role="timer"
            className="absolute font-semibold text-6xl tabular-nums tracking-tight"
          >
            {formatCountdown(left)}
          </span>
        </div>

        <DialogPrimitive.Description className="max-w-md text-balance text-center font-medium text-lg">
          {task?.title}
        </DialogPrimitive.Description>

        <div className="flex items-center gap-2">
          {running ? (
            <Button size="lg" onClick={pause}>
              <Pause />
              {t("tasks:focus.actions.pause")}
            </Button>
          ) : (
            <Button size="lg" onClick={resume}>
              <Play />
              {notStarted
                ? t("tasks:focus.actions.start")
                : t("tasks:focus.actions.resume")}
            </Button>
          )}
          <Button size="lg" variant="outline" onClick={skip}>
            <SkipForward />
            {t("tasks:focus.actions.skip")}
          </Button>
          <Button size="lg" variant="ghost" onClick={stop}>
            <Square />
            {t("tasks:focus.actions.stop")}
          </Button>
        </div>
      </div>
    </>
  );
}
