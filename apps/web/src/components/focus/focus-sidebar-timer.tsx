import { BellRing, Pause, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useFocusStore } from "@/store/focus";
import { formatCountdown } from "./format-countdown";
import { isRunning } from "./focus-timer";
import { useFocusClock } from "./use-focus-clock";

export function FocusSidebarTimer() {
  const session = useFocusStore((state) => state.session);
  if (!session) return null;
  return <FocusSidebarTimerButton running={isRunning(session)} />;
}

function FocusSidebarTimerButton({ running }: { running: boolean }) {
  const { t } = useTranslation();
  const openView = useFocusStore((state) => state.openView);
  const phase = useFocusStore((state) => state.session?.phase ?? "focus");
  const alarm = useFocusStore((state) => state.alarm);
  const left = useFocusClock();
  const Icon = alarm ? BellRing : running ? Timer : Pause;

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
            {t(`tasks:focus.phase.${phase}`)}
          </span>
          <span className="font-medium tabular-nums">
            {formatCountdown(left)}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
