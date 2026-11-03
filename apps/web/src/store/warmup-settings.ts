import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_WARMUP_SETTINGS,
  type WarmupSettings,
} from "@/components/warmup/warmup-plan";

type WarmupSettingsStore = {
  settings: WarmupSettings;
  changeSettings: (change: Partial<WarmupSettings>) => void;
};

export const useWarmupSettingsStore = create<WarmupSettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_WARMUP_SETTINGS,
      changeSettings: (change) =>
        set(({ settings }) => ({ settings: { ...settings, ...change } })),
    }),
    {
      name: "warmup-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ settings }) => ({ settings }),
      merge: (persisted, current) => ({
        ...current,
        settings: {
          ...DEFAULT_WARMUP_SETTINGS,
          ...(persisted as Partial<WarmupSettingsStore> | undefined)?.settings,
        },
      }),
    },
  ),
);
