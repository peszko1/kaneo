import { cn } from "@/lib/cn";

export function ItemCount({
  count,
  emphasize,
}: {
  count: number;
  emphasize?: boolean;
}) {
  return (
    <span
      className={cn(
        "ml-auto flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] tabular-nums",
        emphasize
          ? "bg-foreground font-semibold text-background"
          : "font-medium text-muted-foreground",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
