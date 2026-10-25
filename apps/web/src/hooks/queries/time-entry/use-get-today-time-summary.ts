import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import getTimeSummary from "@/fetchers/time-entry/get-time-summary";
import { useLocalDay } from "@/hooks/use-local-day";

// The caller's tracked time since their local midnight.
function useGetTodayTimeSummary(workspaceId: string) {
  const day = useLocalDay();

  return useQuery({
    queryKey: ["time-summary", workspaceId, day],
    queryFn: () =>
      getTimeSummary(workspaceId, new Date(day), addDays(new Date(day), 1)),
    enabled: Boolean(workspaceId),
    refetchOnMount: "always",
  });
}

export default useGetTodayTimeSummary;
