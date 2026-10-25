import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatTrackedTime } from "./format-tracked-time";
import { PropertyRow } from "./property-row";
import { useTrackedSeconds } from "./use-tracked-seconds";

export function TrackedTimeRow({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const seconds = useTrackedSeconds(taskId);
  if (seconds < 60) return null;

  return (
    <PropertyRow label={t("tasks:properties.timeTracked")}>
      <div className="flex h-7.5 min-w-0 items-center gap-2 px-2 font-medium text-[13px] text-foreground tabular-nums [&_svg]:size-3.5 [&_svg]:shrink-0">
        <Timer className="text-muted-foreground" />
        {formatTrackedTime(seconds)}
      </div>
    </PropertyRow>
  );
}
