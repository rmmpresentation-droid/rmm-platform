import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { presenterJourney, journeyGroups } from "../src/lib/presenter-journey.mjs";

test("Arabic journey covers the 23 requested sections in order and links to existing media", () => {
  assert.equal(presenterJourney.length, 23);
  assert.deepEqual(
    presenterJourney.map((step) => step.id),
    Array.from({ length: 23 }, (_, i) => i + 1),
  );
  assert.equal(journeyGroups.length, 5);
  for (const step of presenterJourney) {
    assert.ok(step.title && step.lead && step.note);
    assert.ok(step.group >= 0 && step.group < journeyGroups.length);
    if (step.image) assert.ok(existsSync(`public${step.image}`), step.image);
  }
});

test("unverified financial terms and medical safety remain explicitly qualified", () => {
  assert.match(presenterJourney[7].title, /خيالي/);
  assert.match(presenterJourney[16].note, /90/);
  assert.match(presenterJourney[17].note, /لم يتم التحقق/);
  for (const id of [11, 12, 13, 14, 15, 21, 22])
    assert.equal(presenterJourney[id - 1].health, true);
});
