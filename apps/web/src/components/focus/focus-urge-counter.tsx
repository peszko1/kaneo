import { Wind } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFocusUrgesStore } from "@/store/focus-urges";

export function FocusUrgeCounter() {
  const { t } = useTranslation();
  const resisted = useFocusUrgesStore((state) => state.resisted);
  const resist = useFocusUrgesStore((state) => state.resist);

  return (
    <div className="flex max-w-56 flex-col items-center gap-2 text-center">
      <button
        type="button"
        onClick={resist}
        className="flex flex-col items-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.97]"
      >
        <Wind className="size-5" aria-hidden />
        {t("tasks:focus.urge.prompt")}
      </button>
      <p aria-live="polite" className="min-h-5 font-medium text-sm">
        {resisted > 0 && t("tasks:focus.urge.resisted", { count: resisted })}
      </p>
    </div>
  );
}
