import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildPartPresentation } from "../src/lib/five-part-presentation.mjs";
const hashes = [
  "5c3872704d8e90175e5cfa44d08d25ca3b4fa1854764f8c1f220b41f0da6a4d8",
  "cbe490ca453c5858ee781af4d4342b00615f992bea32ca918678cdbdbd86a3f7",
  "9ab6b83ef3866b585be771081c9d6b360d17c63c7841c3bc1938658664b1e6d3",
  "5148d762b56c99d2ea1640792c07a9c40f502690bde7f4b6d1ee569a29573c2a",
  "fb4f565d3339b0b2e15fd7dd6b22c2555d9881826b0ed749c4832f71cfaff0b0",
];
const slides = [6, 6, 5, 9, 17];
const images = [0, 0, 13, 32, 25];
const font = "data:font/ttf;base64,AA==";
for (let i = 1; i <= 5; i++)
  test(`partie ${i} : source, isolation et navigation`, () => {
    const source = readFileSync(
      new URL(`../src/assets/presentation/part-${i}.html`, import.meta.url),
      "utf8",
    );
    const normalized = source.replace(/\r\n?/g, "\n");
    assert.equal(createHash("sha256").update(normalized).digest("hex"), hashes[i - 1]);
    const html = buildPartPresentation(source, i, font, font);
    assert.equal((html.match(/<section class="slide/g) || []).length, slides[i - 1]);
    assert.equal((html.match(/data:image\//g) || []).length, images[i - 1]);
    assert.ok(html.includes("connect-src 'none'"));
    assert.ok(!html.includes("rmm-source-notice"));
    assert.ok(!html.includes("--rmm-notice-height"));
    assert.ok(!html.includes("نصّ المصدر للمراجعة فقط"));
    assert.ok(html.includes("scrollbar-width:none"));
    assert.ok(!html.includes('href="https://fonts.googleapis.com'));
    assert.ok(!html.includes("/cdn-cgi/challenge-platform/"));
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 2);
    for (const [, script] of scripts) assert.doesNotThrow(() => new Function(script));
    if (i < 5) {
      assert.ok(html.includes("rmm-next-part"));
      assert.ok(html.includes(`الانتقال إلى الجزء ${i + 1}`));
    } else assert.ok(!html.includes("rmm-next-part"));
    assert.equal(buildPartPresentation(normalized.replace(/\n/g, "\r\n"), i, font, font), html);
  });
test("parties invalides et messages non authentifiés refusés", () => {
  assert.throws(() => buildPartPresentation("", 0, font, font));
  assert.throws(() => buildPartPresentation("", 6, font, font));
  assert.throws(() => buildPartPresentation("", 1, "https://example.com", font));
  const component = readFileSync(
    new URL("../src/components/workspace/OriginalPresentation.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /event\.source !== frame\.current\?\.contentWindow/);
  assert.match(component, /current === sourcePart/);
  assert.match(component, /sandbox="allow-scripts"/);
  assert.doesNotMatch(component, /Document original non vérifié/);
  assert.doesNotMatch(component, /document non validé/);
  assert.match(component, /Présentation originale intégrale/);
});
