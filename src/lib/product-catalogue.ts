// Noms : noms des fichiers fournis (sans l'extension). Visuels : extraits des PDF.
// Les renseignements des brochures sont provisoires et ne sont pas des allégations validées.
export type CatalogueProduct = {
  id: string;
  name: string;
  sourceFile: string;
  description: string;
  ingredients?: string;
};
export const catalogue: CatalogueProduct[] = [
  {
    id: "3s-capsule",
    name: "3S",
    sourceFile: "3S.pdf",
    description: "Capsules de soin présentées par Swisderm.",
  },
  {
    id: "bio-white-cream",
    name: "Bio White",
    sourceFile: "Bio White.pdf",
    description: "Crème de soin présentée dans la brochure sous le nom Bio White Cream.",
    ingredients:
      "La brochure cite notamment le citron, les vitamines C et E, le colza et les feuilles de myrtille.",
  },
  {
    id: "b-cream",
    name: "Btox",
    sourceFile: "Btox.pdf",
    description: "Crème de soin présentée dans la brochure sous le nom B Cream.",
    ingredients:
      "La brochure cite notamment l’huile de tournesol, l’acétate de tocophérol, le triglycéride caprylique et l’extrait de lierre.",
  },
  {
    id: "hydrating-toning-lotion",
    name: "HTL",
    sourceFile: "HTL.pdf",
    description: "Lotion présentée dans la brochure sous le nom Hydrating Toning Lotion.",
  },
  {
    id: "s-fem-serum",
    name: "S FEM SERUM-EN",
    sourceFile: "S FEM SERUM-EN.pdf",
    description: "Sérum présenté par Swisderm.",
  },
  {
    id: "s-hydro",
    name: "S Hydro Leaflet-EN",
    sourceFile: "S Hydro Leaflet-EN.pdf",
    description: "Appareil présenté dans la brochure sous le nom S Hydro.",
  },
  {
    id: "s-xtra-caffe",
    name: "S Xtra Caffe-EN",
    sourceFile: "S Xtra Caffe-EN.pdf",
    description: "Café en sachets présenté par Swisderm.",
  },
  {
    id: "s-factor",
    name: "S-Factor-EN",
    sourceFile: "S-Factor-EN.pdf",
    description: "Produit en sachets présenté par Swisderm.",
  },
  {
    id: "sun-protector",
    name: "Sun Protector",
    sourceFile: "Sun Protector.pdf",
    description: "Produit solaire présenté par Swisderm.",
    ingredients:
      "La brochure cite notamment l’arbutine, l’huile d’olive, la cire d’abeille et l’huile d’argan.",
  },
  {
    id: "gentle-cleansing-cream",
    name: "Swisderm Gentle Cleansing Cream EN",
    sourceFile: "Swisderm Gentle Cleansing Cream EN.pdf",
    description: "Crème nettoyante présentée par Swisderm.",
  },
  {
    id: "revitalizing-foundation",
    name: "Swisderm Revitalizing Foundation EN",
    sourceFile: "Swisderm Revitalizing Foundation EN.pdf",
    description: "Fond de teint présenté par Swisderm.",
  },
];
