import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFocusStore } from "@/store/focus";
import { FOCUS_MODES, type FocusMode } from "./focus-timer";

export function FocusModeSwitch({ mode }: { mode: FocusMode }) {
  const { t } = useTranslation();
  const switchMode = useFocusStore((state) => state.switchMode);

  return (
    <ToggleGroup
      value={[mode]}
      onValueChange={(values) => {
        const next = FOCUS_MODES.find((option) => option === values[0]);
        if (next) switchMode(next);
      }}
      size="sm"
      aria-label={t("tasks:focus.mode.label")}
      className="rounded-lg border border-input bg-background p-0.5 dark:bg-input/32"
    >
      {FOCUS_MODES.map((option) => (
        <ToggleGroupItem
          key={option}
          value={option}
          className="h-7 px-3 sm:h-6"
        >
          {t(`tasks:focus.mode.${option}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
