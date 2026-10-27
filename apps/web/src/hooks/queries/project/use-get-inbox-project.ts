import { useQuery } from "@tanstack/react-query";
import getInboxProject from "@/fetchers/project/get-inbox-project";

// The caller's private inbox project; the server makes it on first use.
function useGetInboxProject(workspaceId: string) {
  return useQuery({
    queryKey: ["projects", workspaceId, "inbox"],
    queryFn: () => getInboxProject(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export default useGetInboxProject;
