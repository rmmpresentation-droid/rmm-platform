export const sectionNames = ['prospects', 'taches', 'rendezvous', 'networkers', 'formations', 'ressources', 'commandes', 'stock'];
export const statuses = {
  prospects: ['', 'Premier contact', 'Présentation', 'Closing', 'Consommateur', 'Candidat networker', 'Sans commande'],
  taches: ['À faire', 'En cours', 'Terminée'], rendezvous: ['Demandé', 'Proposé', 'Confirmé', 'Réalisé', 'Annulé'],
  networkers: ['Formation requise', 'Actif', 'Suspendu'], formations: ['À préparer', 'Disponible', 'Terminée'],
  ressources: ['Brouillon', 'Disponible'], commandes: ['À traiter', 'En préparation', 'Expédiée', 'Livrée', 'Annulée'], stock: ['Disponible', 'Rupture', 'Inactif'],
};
export function prospectStep(status) {
  if (status === 'Premier contact') return 0;
  if (status === 'Présentation') return 1;
  if (['Closing', 'Consommateur', 'Candidat networker', 'Sans commande'].includes(status)) return 2;
  return -1;
}
export const emptyStore = () => Object.fromEntries(sectionNames.map(name => [name, []]));

/** Reject invalid backups instead of silently replacing existing local data. */
export function parseBackup(json) {
  const input = JSON.parse(json);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Format de sauvegarde invalide');
  const result = emptyStore();
  for (const name of sectionNames) {
    if (!Array.isArray(input[name])) throw new Error(`Section manquante ou invalide : ${name}`);
    const ids = new Set();
    for (const item of input[name]) {
      if (!item || typeof item !== 'object' || ['id', 'title', 'detail', 'status', 'owner', 'date'].some(k => typeof item[k] !== 'string') || !item.id || !item.title.trim() || !statuses[name].includes(item.status) || ids.has(item.id)) throw new Error(`Élément invalide dans ${name}`);
      ids.add(item.id);
    }
    result[name] = input[name].map(({id, title, detail, status, owner, date}) => ({id, title, detail, status, owner, date}));
  }
  return result;
}
