export type Item = { id: string; title: string; detail: string; status: string; owner: string; date: string };
export type Section = 'prospects' | 'taches' | 'rendezvous' | 'networkers' | 'formations' | 'ressources' | 'commandes' | 'stock';
export type Store = Record<Section, Item[]>;
export const sectionNames: Section[];
export const statuses: Record<Section, string[]>;
export function emptyStore(): Store;
export function parseBackup(json: string): Store;
