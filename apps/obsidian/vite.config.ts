import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      bundle: {
        command: "node esbuild.config.mjs",
        cache: false,
      },
      "check:types": {
        command: "tsc --noEmit -p tsconfig.json",
        // Typechecks read sources across the workspace and `auto` can't trace
        // tsc 7, so a cached result can be stale; always run them (like cli).
        cache: false,
      },
      "test:run": {
        command: "vp test run --config vitest.config.ts",
        cache: false,
      },
    },
  },
});
