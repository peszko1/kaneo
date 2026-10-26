import { useQuery } from "@tanstack/react-query";
import getProjectTimeTotals from "@/fetchers/time-entry/get-project-time-totals";

// Everyone's tracked seconds per project, keyed by project ID.
function useGetProjectTimeTotals(workspaceId: string) {
  return useQuery({
    queryKey: ["project-time-totals", workspaceId],
    queryFn: () => getProjectTimeTotals(workspaceId),
    enabled: Boolean(workspaceId),
    refetchOnMount: "always",
    select: (data) =>
      new Map(
        data.projects.map((project) => [
          project.projectId,
          project.totalSeconds,
        ]),
      ),
  });
}

export default useGetProjectTimeTotals;
