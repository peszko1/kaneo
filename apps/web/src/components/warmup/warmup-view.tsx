import { Play, SkipForward, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { noteName } from "./note-name";
import { useWarmupPlayer } from "./use-warmup-player";
import { WARMUP_PATTERN, warmupRegister } from "./warmup-plan";
import { WarmupSettingsForm } from "./warmup-settings-form";

const REGISTER_COLOR = {
  chest: "text-orange-600 dark:text-orange-400",
  mix: "text-purple-600 dark:text-purple-400",
  head: "text-blue-600 dark:text-blue-400",
} as const;

export function WarmupView() {
  const { t } = useTranslation();
  const { playing, position, start, stop, nextVowel } = useWarmupPlayer();
  const names = t("navigation:warmup.noteNames");
  const mark = position?.mark;
  const register = mark ? warmupRegister(mark.root) : null;

  return (
    <div className="flex flex-col gap-6 p-4 md:flex-row md:items-start md:px-6">
      <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border p-6 text-center">
        <p className="max-w-prose text-muted-foreground text-sm">
          {t("navigation:warmup.description")}
        </p>
        <div className="font-semibold text-5xl" aria-live="polite">
          {mark?.vowel ?? "–"}
        </div>
        <div className="min-h-12 text-sm">
          {mark && register ? (
            <>
              <div className="font-medium text-base">
                {WARMUP_PATTERN.map((step) =>
                  noteName(mark.root + step, names, false),
                ).join(" ")}
              </div>
              <div className="text-muted-foreground">
                {noteName(mark.root, names)} → {noteName(mark.root + 7, names)}{" "}
                ·{" "}
                <span className={cn("font-medium", REGISTER_COLOR[register])}>
                  {t(`navigation:warmup.register.${register}`)}
                </span>{" "}
                · {mark.dir === "up" ? "↑" : "↓"} {mark.index + 1}/{mark.count}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">
              {t("navigation:warmup.idle")}
            </span>
          )}
        </div>
        <Progress value={(position?.progress ?? 0) * 100} />
        <div className="flex flex-wrap justify-center gap-2">
          {playing ? (
            <Button onClick={stop} variant="outline" size="lg">
              <Square />
              {t("navigation:warmup.stop")}
            </Button>
          ) : (
            <Button onClick={() => start(0)} size="lg">
              <Play />
              {t("navigation:warmup.play")}
            </Button>
          )}
          <Button onClick={nextVowel} variant="outline" size="lg">
            <SkipForward />
            {t("navigation:warmup.nextVowel")}
          </Button>
        </div>
      </section>
      <section className="w-full max-w-sm rounded-xl border p-4">
        <h2 className="mb-3 font-medium text-sm">
          {t("navigation:warmup.settings")}
        </h2>
        <WarmupSettingsForm />
      </section>
    </div>
  );
}
