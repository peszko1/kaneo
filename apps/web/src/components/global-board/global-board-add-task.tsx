import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import useGetInboxProject from "@/hooks/queries/project/use-get-inbox-project";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import type {
  GlobalBoardFilters,
  GlobalBoardLane,
} from "./global-board-filters";

// A new task from a lane: it goes to the inbox unless a project is picked,
// and starts with the label the board is filtered to, as a pinned label view.
export function GlobalBoardAddTask({
  lane,
  filters,
  onClose,
}: {
  lane: GlobalBoardLane;
  filters: GlobalBoardFilters;
  onClose: () => void;
}) {
  const { data: workspace } = useActiveWorkspace();
  const { data: inbox } = useGetInboxProject(workspace?.id ?? "");
  const label =
    filters.label?.length === 1 && !filters.negate?.includes("label")
      ? filters.label[0]
      : undefined;

  return (
    <CreateTaskModal
      open
      onClose={onClose}
      status={lane === "backlog" ? "planned" : undefined}
      inboxProject={inbox ? { id: inbox.id, slug: inbox.slug } : undefined}
      presetLabelName={label}
    />
  );
}
