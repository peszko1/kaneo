import { useQuery } from "@tanstack/react-query";
import getPractice from "@/fetchers/practice/get-practice";

export const PRACTICE_KEY = ["practice"] as const;

// Only whether the 120h tab is on; the tracker page loads its own data.
function useGetPractice() {
  return useQuery({
    queryKey: PRACTICE_KEY,
    queryFn: getPractice,
    select: (practice) => ({
      enabled: practice.enabled,
      version: practice.version,
    }),
  });
}

export default useGetPractice;
