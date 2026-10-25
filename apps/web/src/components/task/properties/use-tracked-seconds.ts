import useGetTimeEntriesByTaskId from "@/hooks/queries/time-entry/use-get-time-entries";

// Total of the finished time entries on a task; running entries count once closed.
export function useTrackedSeconds(taskId: string) {
  const { data: entries } = useGetTimeEntriesByTaskId(taskId);
  return (entries ?? []).reduce((sum, entry) => sum + (entry.duration ?? 0), 0);
}
