import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildNewPresentation } from "../src/lib/new-presentation.mjs";
const source = readFileSync(
  new URL("../src/assets/presentation/partnership-new.html", import.meta.url),
  "utf8",
);
const font = "data:font/ttf;base64,AA==";
test("nouvelle présentation : source intacte et onze images intégrées", () => {
  assert.equal(
    createHash("sha256").update(source.replace(/\r\n?/g, "\n")).digest("hex"),
    "c16ae05633f54ce3e22b264280b4637e2e71e5bb668422e4a7c0c63d7fda18b3",
  );
  assert.equal((source.match(/<section class="slide/g) || []).length, 7);
  assert.equal((source.match(/data:image\/jpeg;base64,/g) || []).length, 11);
  for (const name of [
    "S Factor",
    "S Xtra Caffe",
    "SHYDRO",
    "3S Capsule",
    "B’tox Cream",
    "HTL بخاخ",
    "Bio White",
    "Sun Protector",
    "S Fem Serum",
    "Gentle Cleansing",
    "Revitalizing Foundation",
  ])
    assert.ok(source.includes(name));
  for (const marker of [
    "const X=",
    "function openD",
    "function stepD",
    "المكوّنات الرئيسية",
    "15–24",
    "167.3",
  ])
    assert.ok(source.includes(marker), marker);
});
test("copie isolée, polices locales et avis, conserve les scripts et images", () => {
  const html = buildNewPresentation(source, font, font);
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(html.includes("img-src data:"));
  assert.ok(html.includes("غير متحقّق منها"));
  assert.ok(!html.includes('href="https://fonts.googleapis.com'));
  assert.equal((html.match(/data:image\/jpeg;base64,/g) || []).length, 11);
  assert.equal((html.match(/<section class="slide/g) || []).length, 7);
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script[1]));
  assert.throws(() => buildNewPresentation("invalid", font, font));
  assert.throws(() => buildNewPresentation(source, "https://bad", font));
  assert.equal(buildNewPresentation(source.replace(/\n/g, "\r\n"), font, font), html);
});
test("le studio ne monte pas les versions historiques", () => {
  const workspace = readFileSync(
    new URL("../src/components/workspace/LocalWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const component = readFileSync(
    new URL("../src/components/workspace/OriginalPresentation.tsx", import.meta.url),
    "utf8",
  );
  assert.match(workspace, /<OriginalPresentation\s*\/>/);
  assert.doesNotMatch(workspace, /<PresentationStudio\s*\/>/);
  assert.match(component, /part-1\.html\?raw/);
  assert.doesNotMatch(component, /partnership-new\.html\?raw/);
  assert.match(component, /sandbox="allow-scripts"/);
  assert.match(component, /Quitter le plein écran/);
});
