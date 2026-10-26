import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTimeEntry, {
  type UpdateTimeEntryRequest,
} from "@/fetchers/time-entry/update-time-entry";

function useUpdateTimeEntry(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTimeEntryRequest) => updateTimeEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["time-entries", taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["project-time-totals"] });
      queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
    },
  });
}

export default useUpdateTimeEntry;
