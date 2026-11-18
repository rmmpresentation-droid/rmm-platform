import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  buildOriginalPresentation,
  originalProductImages,
} from "../src/lib/original-presentation.mjs";

const source = readFileSync(
  new URL("../src/assets/presentation/partnership-original.html", import.meta.url),
  "utf8",
);
const font = "data:font/ttf;base64,AA==";
test("le fichier fourni reste inchangé, avec toutes les données et les diapositives", () => {
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "d3a74dca99de4ac5df62d250091187db86afbb77c92d62982c59c5e4d2e0d889",
  );
  assert.equal((source.match(/<section class="slide/g) || []).length, 7);
  for (const marker of [
    "15–24",
    "167.3",
    "24.6",
    "5.6",
    "الجملة المقترحة للعرض",
    "SHYDRO",
    "82",
    "13",
  ])
    assert.ok(source.includes(marker), marker);
});
test("affichage isolé : images associées à chaque produit, polices locales et scripts valides", () => {
  const html = buildOriginalPresentation(source, "https://example.test", font, font);
  assert.equal(Object.keys(originalProductImages).length, 11);
  for (const [name, file] of Object.entries(originalProductImages)) {
    assert.ok(source.includes(`'${name}'`), name);
    assert.ok(existsSync(`public/products/${file}`), file);
    assert.ok(html.includes(`https://example.test/products/${file}`));
  }
  assert.ok(html.includes("rmm-product-image"));
  assert.ok(html.includes("rmm-detail-image"));
  assert.ok(html.includes("غير متحقّق منها"));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(!html.includes('href="https://fonts.googleapis.com'));
  assert.equal((html.match(/<section class="slide/g) || []).length, 7);
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script[1]));
  assert.throws(() => buildOriginalPresentation("invalid", "https://example.test", font, font));
  assert.throws(() => buildOriginalPresentation(source, "javascript:alert(1)", font, font));
});
