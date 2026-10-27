import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import getTaskTimeTotals from "@/fetchers/time-entry/get-task-time-totals";
import { useLocalDay } from "@/hooks/use-local-day";

// The caller's tracked time per task over the last `days` local days,
// today included.
function useGetRecentTaskTime(workspaceId: string, days: number) {
  const day = useLocalDay();

  return useQuery({
    // Under "time-summary" so a recorded entry refreshes it too.
    queryKey: ["time-summary", workspaceId, "tasks", day, days],
    queryFn: () =>
      getTaskTimeTotals(
        workspaceId,
        addDays(new Date(day), 1 - days),
        addDays(new Date(day), 1),
      ),
    enabled: Boolean(workspaceId),
    refetchOnMount: "always",
  });
}

export default useGetRecentTaskTime;
