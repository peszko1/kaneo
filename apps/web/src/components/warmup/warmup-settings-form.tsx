import { useTranslation } from "react-i18next";
import { FocusMinutesField } from "@/components/focus/focus-minutes-field";
import { FocusToggleField } from "@/components/focus/focus-toggle-field";
import { useWarmupSettingsStore } from "@/store/warmup-settings";
import { WARMUP_VOWELS } from "./warmup-plan";
import { WarmupNoteSelect } from "./warmup-note-select";

// Every change applies from the next round, without stopping the warm-up.
export function WarmupSettingsForm() {
  const { t } = useTranslation();
  const settings = useWarmupSettingsStore((state) => state.settings);
  const changeSettings = useWarmupSettingsStore(
    (state) => state.changeSettings,
  );

  return (
    <div className="flex flex-col gap-3">
      <WarmupNoteSelect
        label={t("navigation:warmup.low")}
        value={settings.low}
        onChange={(low) => changeSettings({ low })}
      />
      <WarmupNoteSelect
        label={t("navigation:warmup.high")}
        value={settings.high}
        onChange={(high) => changeSettings({ high })}
      />
      <FocusMinutesField
        label={t("navigation:warmup.bpm")}
        value={settings.bpm}
        min={60}
        max={200}
        onChange={(bpm) => changeSettings({ bpm })}
      />
      <FocusToggleField
        label={t("navigation:warmup.down")}
        checked={settings.down}
        onChange={(down) => changeSettings({ down })}
      />
      <FocusToggleField
        label={t("navigation:warmup.melody")}
        checked={settings.melody}
        onChange={(melody) => changeSettings({ melody })}
      />
      {WARMUP_VOWELS.map((vowel) => (
        <FocusToggleField
          key={vowel}
          label={t("navigation:warmup.singOn", { vowel })}
          checked={settings.vowels.includes(vowel)}
          onChange={(on) =>
            changeSettings({
              vowels: on
                ? WARMUP_VOWELS.filter(
                    (v) => v === vowel || settings.vowels.includes(v),
                  )
                : settings.vowels.filter((v) => v !== vowel),
            })
          }
        />
      ))}
    </div>
  );
}
