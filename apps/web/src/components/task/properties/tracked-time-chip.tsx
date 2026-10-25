import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { propertyChipClass } from "@/components/custom-fields/property-chip-class";
import { cn } from "@/lib/cn";
import { formatTrackedTime } from "./format-tracked-time";
import { useTrackedSeconds } from "./use-tracked-seconds";

export function TrackedTimeChip({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const seconds = useTrackedSeconds(taskId);
  if (seconds < 60) return null;

  return (
    <span
      className={cn(
        propertyChipClass,
        "h-8 bg-accent/30 text-foreground tabular-nums [&_svg]:size-3.5 [&_svg]:shrink-0",
      )}
    >
      <Timer className="text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{t("tasks:properties.timeTracked")}: </span>
      {formatTrackedTime(seconds)}
    </span>
  );
}
