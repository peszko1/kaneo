import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_FOCUS_SETTINGS,
  type FocusSettings,
} from "@/components/focus/focus-timer";

export const FOCUS_SETTINGS_STORAGE_KEY = "focus-settings";

type FocusSettingsStore = {
  settings: FocusSettings;
  changeSettings: (change: Partial<FocusSettings>) => void;
  resetSettings: () => void;
};

export const useFocusSettingsStore = create<FocusSettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_FOCUS_SETTINGS,
      changeSettings: (change) =>
        set(({ settings }) => ({ settings: { ...settings, ...change } })),
      resetSettings: () => set({ settings: DEFAULT_FOCUS_SETTINGS }),
    }),
    {
      name: FOCUS_SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ settings }) => ({ settings }),
      // Fill in fields added after the settings were saved.
      merge: (persisted, current) => ({
        ...current,
        settings: {
          ...DEFAULT_FOCUS_SETTINGS,
          ...(persisted as Partial<FocusSettingsStore> | undefined)?.settings,
        },
      }),
    },
  ),
);
