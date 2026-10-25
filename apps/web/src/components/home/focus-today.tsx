import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatTrackedTime } from "@/components/task/properties/format-tracked-time";
import useGetTodayTimeSummary from "@/hooks/queries/time-entry/use-get-today-time-summary";

export function FocusToday({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const { data } = useGetTodayTimeSummary(workspaceId);
  if (!data || data.totalSeconds < 60) return null;

  return (
    <p className="flex items-center gap-1.5 font-medium text-[13px] text-muted-foreground">
      <Timer aria-hidden="true" className="size-3.5" />
      {t("workspace:home.focusToday", {
        time: formatTrackedTime(data.totalSeconds),
        count: data.entryCount,
      })}
    </p>
  );
}
