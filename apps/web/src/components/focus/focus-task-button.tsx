import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HeaderIconButton } from "@/components/task/header/header-icon-button";
import { useFocusStore } from "@/store/focus";
import { unlockAlarmSound } from "./alarm-sound";
import type { FocusTask } from "./pomodoro";

export function FocusTaskButton({ task }: { task: FocusTask }) {
  const { t } = useTranslation();
  const focusOn = useFocusStore((state) => state.focusOn);

  return (
    <HeaderIconButton
      label={t("tasks:focus.start")}
      onClick={() => {
        unlockAlarmSound();
        focusOn(task);
      }}
    >
      <Timer />
    </HeaderIconButton>
  );
}
