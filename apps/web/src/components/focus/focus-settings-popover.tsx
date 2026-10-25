import { Settings2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFocusSettingsStore } from "@/store/focus-settings";
import { FocusMinutesField } from "./focus-minutes-field";
import { canNotify, requestNotificationPermission } from "./focus-notification";
import { FocusToggleField } from "./focus-toggle-field";

const MAX_MINUTES = 240;

export function FocusSettingsPopover() {
  const { t } = useTranslation();
  const settings = useFocusSettingsStore((state) => state.settings);
  const changeSettings = useFocusSettingsStore((state) => state.changeSettings);
  const resetSettings = useFocusSettingsStore((state) => state.resetSettings);
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("tasks:focus.settings.title")}
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        <Settings2 />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-3">
          <p className="font-medium text-sm">
            {t(`tasks:focus.mode.${settings.mode}`)}
          </p>

          {settings.mode === "pomodoro" && (
            <>
              <FocusMinutesField
                label={t("tasks:focus.settings.focusMinutes")}
                value={settings.focusMinutes}
                max={MAX_MINUTES}
                onChange={(focusMinutes) => changeSettings({ focusMinutes })}
              />
              <FocusMinutesField
                label={t("tasks:focus.settings.shortBreakMinutes")}
                value={settings.shortBreakMinutes}
                max={MAX_MINUTES}
                onChange={(shortBreakMinutes) =>
                  changeSettings({ shortBreakMinutes })
                }
              />
              <FocusMinutesField
                label={t("tasks:focus.settings.longBreakMinutes")}
                value={settings.longBreakMinutes}
                max={MAX_MINUTES}
                onChange={(longBreakMinutes) =>
                  changeSettings({ longBreakMinutes })
                }
              />
              <FocusMinutesField
                label={t("tasks:focus.settings.roundsPerLongBreak")}
                value={settings.roundsPerLongBreak}
                max={12}
                onChange={(roundsPerLongBreak) =>
                  changeSettings({ roundsPerLongBreak })
                }
              />
            </>
          )}

          {settings.mode === "countdown" && (
            <FocusMinutesField
              label={t("tasks:focus.settings.countdownMinutes")}
              value={settings.countdownMinutes}
              max={MAX_MINUTES}
              onChange={(countdownMinutes) =>
                changeSettings({ countdownMinutes })
              }
            />
          )}

          {settings.mode === "flowtime" && (
            <p className="text-muted-foreground text-sm">
              {t("tasks:focus.settings.flowtimeHint")}
            </p>
          )}

          <div className="flex flex-col gap-3 border-border border-t pt-3">
            <FocusToggleField
              label={t("tasks:focus.settings.sound")}
              checked={settings.sound}
              onChange={(sound) => changeSettings({ sound })}
            />
            {canNotify() && (
              <FocusToggleField
                label={t("tasks:focus.settings.desktopNotifications")}
                hint={
                  notificationsBlocked
                    ? t("tasks:focus.settings.notificationsBlocked")
                    : undefined
                }
                checked={settings.desktopNotifications}
                onChange={async (desktopNotifications) => {
                  const allowed =
                    !desktopNotifications ||
                    (await requestNotificationPermission());
                  setNotificationsBlocked(!allowed);
                  changeSettings({
                    desktopNotifications: allowed && desktopNotifications,
                  });
                }}
              />
            )}
            <FocusToggleField
              label={t("tasks:focus.settings.autoStartNext")}
              checked={settings.autoStartNext}
              onChange={(autoStartNext) => changeSettings({ autoStartNext })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-border border-t pt-3">
            <p className="text-muted-foreground text-xs">
              {t("tasks:focus.settings.appliesNext")}
            </p>
            <Button variant="ghost" size="xs" onClick={resetSettings}>
              {t("tasks:focus.settings.reset")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
