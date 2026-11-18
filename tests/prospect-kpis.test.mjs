import test from "node:test";
import assert from "node:assert/strict";
import { countProspectKpis, matchesProspectKpi } from "../src/lib/prospect-kpis.mjs";

test("indicators count visible records, including historical presentation, and filter consistently", () => {
  const entries = [
    "",
    "Premier contact",
    "Présentation",
    "Présentation (nouvelle phase)",
    "Closing",
    "Consommateur",
    "Candidat networker",
    "Sans commande",
  ].map((status) => ({ status }));
  assert.deepEqual(countProspectKpis(entries), {
    all: 8,
    unstarted: 1,
    active: 4,
    consumer: 1,
    candidate: 1,
    refused: 1,
  });
  assert.equal(matchesProspectKpi(entries[2], "active"), true);
  assert.equal(matchesProspectKpi(entries[5], "active"), false);
  assert.equal(matchesProspectKpi(entries[0], "unknown"), false);
  assert.deepEqual(countProspectKpis([]), {
    all: 0,
    unstarted: 0,
    active: 0,
    consumer: 0,
    candidate: 0,
    refused: 0,
  });
});
