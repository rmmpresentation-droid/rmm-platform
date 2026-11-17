import test from "node:test";
import assert from "node:assert/strict";
import { supportedLocales, translate } from "../src/lib/translations.mjs";

test("French, English and Arabic are supported with a French fallback", () => {
  assert.deepEqual(supportedLocales, ["fr", "en", "ar"]);
  assert.equal(translate("fr", "Langue"), "Langue");
  assert.equal(translate("en", "Langue"), "Language");
  assert.notEqual(translate("ar", "Langue"), "Langue");
  assert.equal(translate("en", "Texte non traduit"), "Texte non traduit");
});

test("Arabic covers key public, prospect and presentation labels without changing French", () => {
  for (const text of [
    "Sélection signature",
    "Demander un rendez-vous",
    "Premier contact",
    "Type de participation *",
    "Modifier la fiche prospect",
    "Le bien-être mérite toute notre attention.",
    "Démonstration locale uniquement · Pas de conseils médicaux ou financiers, ni de promesse d’efficacité ou de revenus.",
  ]) {
    assert.notEqual(translate("ar", text), text, text);
    assert.equal(translate("fr", text), text);
  }
});
