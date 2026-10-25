import { useNavigate, useRouter } from "@tanstack/react-router";
import { stepsToReturn } from "./task-return";

// Returns to the page the task was opened from, or else the project board.
export function useTaskBack(workspaceId: string, projectId: string) {
  const router = useRouter();
  const navigate = useNavigate();

  return () => {
    const steps = stepsToReturn(router.history.location.state);
    if (steps !== null) {
      router.history.go(steps);
      return;
    }
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
      params: { workspaceId, projectId },
    });
  };
}
