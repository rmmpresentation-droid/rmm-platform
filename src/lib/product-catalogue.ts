import products from './product-catalogue.json';

// Noms tirés des fichiers, informations des brochures non exhaustives et à valider.
export type CatalogueProduct = {
  id: string;
  name: string;
  sourceFile: string;
  description: string;
  ingredients?: string;
};
export const catalogue: CatalogueProduct[] = products;
