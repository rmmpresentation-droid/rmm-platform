import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { presentationParts, parsePresentationPart } from "../src/lib/presentation-parts.mjs";
import { translate } from "../src/lib/translations.mjs";
test("sélecteur des cinq présentations et transition suivante préservée", () => {
  assert.deepEqual(
    presentationParts.map((p) => p.id),
    [1, 2, 3, 4, 5],
  );
  for (const p of presentationParts) {
    assert.equal(parsePresentationPart(String(p.id)), p.id);
    assert.notEqual(translate("ar", p.label), p.label);
    assert.notEqual(translate("en", p.label), p.label);
  }
  for (const invalid of ["", "0", "6", "2.0", "garbage", " 1", null])
    assert.equal(parsePresentationPart(invalid), null);
  const component = readFileSync(
    new URL("../src/components/workspace/OriginalPresentation.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /aria-label=\{t\("Choisir une présentation"\)\}/);
  assert.match(component, /setPart\(selected\)/);
  assert.match(component, /current === sourcePart && current < 5/);
  assert.match(component, /Partie précédente/);
});
