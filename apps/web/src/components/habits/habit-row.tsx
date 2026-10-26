import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Habit } from "@/fetchers/habit/get-habits";
import { DragHandle } from "@/components/project/sortable/drag-handle";
import { useSortableRow } from "@/components/project/sortable/use-sortable-row";
import { cn } from "@/lib/cn";
import { HabitCheckCell } from "./habit-check-cell";
import type { HabitDay } from "./habit-days";
import { HabitNameInput } from "./habit-name-input";
import { HabitRowMenu } from "./habit-row-menu";

type HabitRowProps = {
  habit: Habit;
  days: readonly HabitDay[];
  formatDay: (date: Date) => string;
  onToggle: (date: string, done: boolean) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

export function HabitRow({
  habit,
  days,
  formatDay,
  onToggle,
  onRename,
  onDelete,
}: HabitRowProps) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const { rowRef, rowStyle, isDragging, handleProps } = useSortableRow(
    habit.id,
    renaming,
  );
  const done = new Set(habit.checks);

  return (
    <tr
      ref={rowRef}
      style={rowStyle}
      className={cn(
        "group/habit border-border/60 border-t bg-background",
        isDragging && "relative z-20 shadow-sm",
      )}
    >
      <th
        scope="row"
        className="sticky left-0 z-10 bg-background py-1.5 pr-1.5 text-left font-normal md:px-2"
      >
        <div className="flex w-40 items-center gap-1 md:w-56 md:gap-1.5">
          <DragHandle
            label={t("navigation:habits.drag", { habit: habit.name })}
            handleProps={handleProps}
            disabled={renaming}
          />
          {renaming ? (
            <HabitNameInput
              initial={habit.name}
              ariaLabel={t("navigation:habits.rename")}
              autoFocus
              onSubmit={(name) => {
                setRenaming(false);
                onRename(name);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <>
              <span className="min-w-0 truncate text-sm" title={habit.name}>
                {habit.name}
              </span>
              <span
                className="shrink-0 rounded-full bg-emerald-500/12 px-1.5 font-medium text-[11px] text-emerald-700 tabular-nums dark:text-emerald-400"
                title={t("navigation:habits.daysDone", {
                  count: habit.doneCount,
                })}
              >
                {habit.doneCount}
              </span>
              <span className="ml-auto">
                <HabitRowMenu
                  name={habit.name}
                  onRename={() => setRenaming(true)}
                  onDelete={onDelete}
                />
              </span>
            </>
          )}
        </div>
      </th>
      {days.map((day) => {
        const isDone = done.has(day.date);
        return (
          <td
            key={day.date}
            className={cn(
              "px-0.5 py-1.5 text-center",
              day.isToday && "bg-accent/60",
            )}
          >
            <div className="flex justify-center">
              <HabitCheckCell
                done={isDone}
                disabled={day.isFuture}
                label={t("navigation:habits.checkLabel", {
                  habit: habit.name,
                  date: formatDay(day.value),
                })}
                onToggle={() => onToggle(day.date, !isDone)}
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
}
