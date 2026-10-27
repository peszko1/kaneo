import { useDroppable } from "@dnd-kit/core";
import { PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

type FoldedBacklogProps = {
  id: string;
  name: string;
  count: number;
  // Data for the board's collision detection, as a column drop target has.
  dropData: Record<string, unknown>;
  onOpen: () => void;
};

// The folded backlog: a narrow strip that still takes dropped cards.
export function FoldedBacklog({
  id,
  name,
  count,
  dropData,
  onOpen,
}: FoldedBacklogProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: "column", ...dropData },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      aria-expanded={false}
      aria-label={t("tasks:kanban.openBacklog", { count })}
      title={t("tasks:kanban.openBacklog", { count })}
      className={cn(
        "flex h-full w-10 cursor-pointer flex-col items-center gap-3 rounded-xl bg-board-lane py-2.5 text-board-title outline-none transition-colors hover:bg-chip-hover focus-visible:ring-2 focus-visible:ring-ring",
        isOver && "ring-2 ring-board-card-ring",
      )}
    >
      <PanelLeftOpen aria-hidden="true" className="size-3.5 text-chip-icon" />
      <span className="font-medium text-[13px] leading-5 [writing-mode:vertical-rl]">
        {name}
      </span>
      <span className="text-board-id text-xs tabular-nums">{count}</span>
    </button>
  );
}
