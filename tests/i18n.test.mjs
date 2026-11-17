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
