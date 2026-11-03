import { useMutation, useQueryClient } from "@tanstack/react-query";
import setPracticeEnabled from "@/fetchers/practice/set-practice-enabled";
import { PRACTICE_KEY } from "@/hooks/queries/practice/use-get-practice";

function useSetPracticeEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPracticeEnabled,
    onSuccess: (practice) => queryClient.setQueryData(PRACTICE_KEY, practice),
  });
}

export default useSetPracticeEnabled;
