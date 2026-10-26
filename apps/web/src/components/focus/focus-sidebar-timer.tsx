import { BellRing, Pause, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useFocusStore } from "@/store/focus";
import { useFocusSettingsStore } from "@/store/focus-settings";
import {
  clockText,
  type FocusSession,
  isOvertime,
  isRunning,
} from "./focus-timer";
import { useFocusClock } from "./use-focus-clock";

export function FocusSidebarTimer() {
  const session = useFocusStore((state) => state.session);
  if (!session) return null;
  return <FocusSidebarTimerButton session={session} />;
}

function FocusSidebarTimerButton({ session }: { session: FocusSession }) {
  const { t } = useTranslation();
  const openView = useFocusStore((state) => state.openView);
  const alarm = useFocusStore((state) => state.alarm);
  const settings = useFocusSettingsStore((state) => state.settings);
  const shown = useFocusClock();
  const Icon = alarm ? BellRing : isRunning(session) ? Timer : Pause;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="default"
          className="h-8 text-sm"
          onClick={openView}
        >
          <Icon aria-hidden="true" />
          <span className="flex-1 truncate">
            {isOvertime(session)
              ? t("tasks:focus.overtime")
              : t(`tasks:focus.phase.${session.phase}`)}
          </span>
          <span className="font-medium tabular-nums">
            {clockText(session, shown, settings)}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
