import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  partnershipSlides,
  partnershipProducts,
  productCategories,
  verificationTopics,
} from "../src/lib/partnership-presentation.mjs";

test("présentation adaptée en sept étapes et onze produits avec images locales", () => {
  assert.deepEqual(
    partnershipSlides.map((s) => s.id),
    ["intro", "context", "direct", "brand", "products", "plan", "decision"],
  );
  assert.ok(partnershipSlides.every((s) => s.title && s.lead && s.note));
  assert.equal(partnershipProducts.length, 11);
  assert.equal(new Set(partnershipProducts.map((p) => p.id)).size, 11);
  const catalogue = JSON.parse(
    readFileSync(new URL("../src/lib/product-catalogue.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(
    new Set(partnershipProducts.map((p) => p.id)),
    new Set(catalogue.map((p) => p.id)),
  );
  for (const product of partnershipProducts) {
    assert.ok(productCategories.includes(product.category));
    assert.ok(product.definition && product.ingredients);
    assert.ok(
      existsSync(`public/products/${product.id}.${product.id === "3s-capsule" ? "png" : "jpg"}`),
      product.id,
    );
  }
  assert.equal(verificationTopics.length, 5);
});
test("les points économiques et produits non validés restent signalés", () => {
  assert.match(partnershipSlides.find((s) => s.id === "context").note, /لم تُتحقق/);
  assert.match(partnershipSlides.find((s) => s.id === "plan").note, /حُجبت/);
  assert.match(partnershipSlides.find((s) => s.id === "products").note, /لم تراجعها/);
  assert.equal(
    partnershipProducts.some((p) => /يعالج|يشفي|يضمن/.test(p.definition)),
    false,
  );
});
