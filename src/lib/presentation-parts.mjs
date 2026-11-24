// Titles are interface labels; the supplied documents retain their original text and language.
export const presentationParts = [
  { id: 1, label: "Investissement" },
  { id: 2, label: "Vente directe" },
  { id: 3, label: "La société Swisderm" },
  { id: 4, label: "Produits Swisderm" },
  { id: 5, label: "Plan de vente directe" },
];
export function parsePresentationPart(value) {
  const item = presentationParts.find((part) => String(part.id) === value);
  return item?.id ?? null;
}
