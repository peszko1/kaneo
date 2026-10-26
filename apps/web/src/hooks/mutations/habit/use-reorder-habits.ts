import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Habit } from "@/fetchers/habit/get-habits";
import reorderHabits from "@/fetchers/habit/reorder-habits";
import { applyOrder } from "@/components/project/sortable/apply-order";
import { HABITS_KEY } from "@/hooks/queries/habit/use-get-habits";

function useReorderHabits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderHabits,
    // Keep the dropped order on screen while the list refetches.
    onMutate: (ids) =>
      queryClient.setQueriesData<Habit[]>({ queryKey: HABITS_KEY }, (habits) =>
        habits ? applyOrder(habits, ids) : habits,
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: HABITS_KEY }),
  });
}

export default useReorderHabits;
