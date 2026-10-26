import { onlineManager } from "@tanstack/react-query";
import { CloudOff, RefreshCw } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { queuedEdits, subscribeToEdits } from "@/lib/offline/edit-outbox";

export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
  const waiting = useSyncExternalStore(
    subscribeToEdits,
    () => queuedEdits().length,
  );
  if (online && waiting === 0) return null;

  const Icon = online ? RefreshCw : CloudOff;
  const text = online
    ? t("common:offline.sending", { count: waiting })
    : waiting > 0
      ? t("common:offline.waiting", { count: waiting })
      : t("common:offline.banner");

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border bg-popover px-3 py-1.5 text-popover-foreground text-xs shadow-lg"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
