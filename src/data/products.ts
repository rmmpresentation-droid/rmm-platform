import source from "@/lib/product-catalogue.json";

// Les contenus sont provisoires. Aucun bénéfice, usage ou tarif n'est activé sans validation.
export type Universe = "visage" | "teint" | "corps" | "interieur";
export type LocalizedText = { fr: string; en: string | null; ar: string | null };
export type Product = {
  slug: string;
  name: string;
  universe: Universe;
  description: LocalizedText;
  ingredients: LocalizedText;
  image: string;
  format: string | null;
  price: number | null;
  benefits: LocalizedText[];
  usage: LocalizedText | null;
  related: string[];
};
const universes: Record<string, Universe> = {
  "3s-capsule": "visage",
  "bio-white-cream": "visage",
  "b-cream": "visage",
  "hydrating-toning-lotion": "visage",
  "gentle-cleansing-cream": "visage",
  "revitalizing-foundation": "teint",
  "sun-protector": "teint",
  "s-fem-serum": "corps",
  "s-factor": "interieur",
  "s-xtra-caffe": "interieur",
  "s-hydro": "interieur",
};
export const products: Product[] = source.map((p) => ({
  slug: p.id,
  name: p.name,
  universe: universes[p.id],
  description: { fr: p.description, en: null, ar: null },
  ingredients: { fr: "ingredients" in p ? p.ingredients || "" : "", en: null, ar: null },
  image: p.id === "3s-capsule" ? "/products/3s-capsule.png" : `/products/${p.id}.jpg`,
  price: null,
  format: null,
  benefits: [],
  usage: null,
  related: [],
}));
export const BRAND = "Rise Mindset Master";
export const universeLabels: Record<Universe, string> = {
  visage: "Visage",
  teint: "Teint & protection",
  corps: "Corps",
  interieur: "Bien-être intérieur",
};
