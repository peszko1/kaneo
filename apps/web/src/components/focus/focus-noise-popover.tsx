import { AudioLines } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/cn";
import { useFocusSettingsStore } from "@/store/focus-settings";
import { NOISE_COLORS } from "./noise";

const CHOICES = ["off", ...NOISE_COLORS] as const;

export function FocusNoisePopover() {
  const { t } = useTranslation();
  const noise = useFocusSettingsStore((state) => state.settings.noise);
  const volume = useFocusSettingsStore((state) => state.settings.noiseVolume);
  const changeSettings = useFocusSettingsStore((state) => state.changeSettings);
  const volumeLabel = useId();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("tasks:focus.noise.title")}
            className={cn(
              "hover:text-foreground",
              noise === "off" ? "text-muted-foreground" : "text-foreground",
            )}
          />
        }
      >
        <AudioLines />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-3">
          <p className="font-medium text-sm">{t("tasks:focus.noise.title")}</p>
          <ToggleGroup
            value={[noise]}
            onValueChange={(values) => {
              const next = CHOICES.find((choice) => choice === values[0]);
              if (next) changeSettings({ noise: next });
            }}
            size="sm"
            aria-label={t("tasks:focus.noise.title")}
            className="w-full rounded-lg border border-input bg-background p-0.5 dark:bg-input/32"
          >
            {CHOICES.map((choice) => (
              <ToggleGroupItem
                key={choice}
                value={choice}
                className="h-7 flex-1 sm:h-6"
              >
                {t(`tasks:focus.noise.${choice}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex flex-col gap-2">
            <p id={volumeLabel} className="text-sm">
              {t("tasks:focus.noise.volume")}
            </p>
            <Slider
              aria-labelledby={volumeLabel}
              value={Math.round(volume * 100)}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                changeSettings({ noiseVolume: next / 100 });
              }}
              disabled={noise === "off"}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {t("tasks:focus.noise.hint")}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
