import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
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

// A content hash per 120h file. Its URLs carry it (`app.js?v=…`), so a CDN in
// front of Kaneo serves the new file right after a deploy instead of a cached one.
function practiceVersions() {
  return new Map(
    practiceFiles().map((file) => [
      path.relative(practiceDir, file).split(path.sep).join("/"),
      createHash("sha256")
        .update(readFileSync(file))
        .digest("hex")
        .slice(0, 10),
    ]),
  );
}

function versionedPracticeHtml(html: string, versions: Map<string, string>) {
  let out = html.replace(/(src|href)="([^"?:]+)"/g, (match, attr, file) => {
    const version = versions.get(file);
    return version ? `${attr}="${file}?v=${version}"` : match;
  });
  const lessons = versions.get("lessons.yaml");
  if (lessons)
    out = out.replace(
      '<meta name="lessons-version" content="">',
      `<meta name="lessons-version" content="${lessons}">`,
    );
  return out;
}

// Emits sw.js with the files every screen needs: the entry, each route's
// chunk, their static imports, styles, and fonts. Rarely used lazy chunks
// (syntax languages, diagrams, other locales) are cached on first use, which
// keeps the install a few megabytes instead of twenty.
export function serviceWorker(): Plugin {
  return {
    name: "kaneo-service-worker",
    apply: "build",
    // Public files are copied as they are; the 120h page then gets versioned URLs.
    closeBundle() {
      const page = path.resolve(import.meta.dirname, "../dist/120h/index.html");
      writeFileSync(
        page,
        versionedPracticeHtml(readFileSync(page, "utf8"), practiceVersions()),
      );
    },
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
      const versions = practiceVersions();
      for (const [file, version] of versions)
        assets.push(
          file === "index.html"
            ? "/120h/index.html"
            : `/120h/${file}?v=${version}`,
        );
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
