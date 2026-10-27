import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FocusUrgesStore = {
  // How many times the user wanted to stop and took a breath instead.
  resisted: number;
  resist: () => void;
};

export const useFocusUrgesStore = create<FocusUrgesStore>()(
  persist(
    (set) => ({
      resisted: 0,
      resist: () => set(({ resisted }) => ({ resisted: resisted + 1 })),
    }),
    {
      name: "focus-urges",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ resisted }) => ({ resisted }),
    },
  ),
);
