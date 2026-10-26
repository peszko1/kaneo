import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

function inlineScriptHashes() {
  return [
    ...read("apps/web/index.html").matchAll(/<script>([\s\S]*?)<\/script>/g),
  ].map(
    ([, body]) =>
      `'sha256-${createHash("sha256").update(body).digest("base64")}'`,
  );
}

for (const config of ["nginx.conf", "nginx.kaneo.conf"]) {
  const source = read(`apps/web/${config}`);
  const csp = source.match(
    /add_header Content-Security-Policy-Report-Only "([^"]+)" always;/,
  )?.[1];

  test(`${config} reports CSP violations for every inline script`, () => {
    assert.ok(csp, "missing Content-Security-Policy-Report-Only");
    const scriptSrc = csp
      .split(";")
      .find((part) => part.trim().startsWith("script-src"));
    assert.ok(scriptSrc, "missing script-src");
    assert.doesNotMatch(scriptSrc, /'unsafe-inline'/);
    for (const hash of inlineScriptHashes())
      assert.ok(
        scriptSrc.includes(hash),
        `script-src lacks ${hash}; update it after changing the inline script in index.html`,
      );
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'self'/);
  });

  test(`${config} sends HSTS only for HTTPS visits`, () => {
    assert.match(
      source,
      /map "\$http_x_forwarded_proto \$http_cf_visitor" \$kaneo_hsts \{\s+"~https" "max-age=31536000";\s+default "";\s+\}/,
    );
    assert.match(
      source,
      /add_header Strict-Transport-Security \$kaneo_hsts always;/,
    );
  });
}
