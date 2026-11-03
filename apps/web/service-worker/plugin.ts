import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const routesDir = path.resolve(import.meta.dirname, "../src/routes");
// The 120h tracker is a standalone page in public/, so its files are listed here.
const practiceDir = path.resolve(import.meta.dirname, "../public/120h");

function practiceFiles() {
  return readdirSync(practiceDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.endsWith(".LICENSE"))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
}

// Emits sw.js with the files every screen needs: the entry, each route's
// chunk, their static imports, styles, and fonts. Rarely used lazy chunks
// (syntax languages, diagrams, other locales) are cached on first use, which
// keeps the install a few megabytes instead of twenty.
export function serviceWorker(): Plugin {
  return {
    name: "kaneo-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = new Set<string>();
      const add = (file: string) => {
        const output = bundle[file];
        if (!output || files.has(file)) return;
        files.add(file);
        if (output.type === "chunk") {
          output.imports.forEach(add);
          output.viteMetadata?.importedCss.forEach(add);
        }
      };
      for (const output of Object.values(bundle)) {
        if (output.type === "asset") {
          if (/\.(css|woff2)$/.test(output.fileName)) add(output.fileName);
        } else if (
          output.isEntry ||
          output.facadeModuleId?.startsWith(routesDir)
        ) {
          add(output.fileName);
        }
      }

      const assets = [...files]
        .filter((file) => file.startsWith("assets/"))
        .sort()
        .map((file) => `/${file}`);
      const practice = practiceFiles();
      for (const file of practice)
        assets.push(`/${path.relative(path.dirname(practiceDir), file)}`);
      // Hashed asset names change with their content; the 120h files do not,
      // so their content goes into the version.
      const hash = createHash("sha256").update(assets.join("\n"));
      for (const file of practice) hash.update(readFileSync(file));
      const version = hash.digest("hex").slice(0, 12);
      const template = readFileSync(
        path.resolve(import.meta.dirname, "sw.js"),
        "utf8",
      );
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: template
          .replace("__KANEO_SW_VERSION__", version)
          .replace("__KANEO_SW_ASSETS__", JSON.stringify(assets)),
      });
    },
  };
}
