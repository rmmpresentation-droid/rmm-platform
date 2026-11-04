// Structured additions to the original generic entries. Values remain strings.
export const businessForms = {
  prospects: { title: 'Nom complet du prospect', detail: 'Notes et résultat de prospection', date: 'Prochaine relance', fields: [
    { key: 'phone', label: 'Téléphone', type: 'tel', required: true },
    { key: 'email', label: 'Adresse e-mail', type: 'email' },
    { key: 'interest', label: 'Centre d’intérêt', type: 'select', options: ['Produits', 'Opportunité network marketing', 'Les deux', 'À préciser'], required: true },
    { key: 'next_action', label: 'Prochaine action', type: 'text' },
  ] },
  rendezvous: { title: 'Sujet du rendez-vous', detail: 'Objectif et informations utiles', date: 'Date et heure souhaitées (heure de Tunis)', fields: [
    { key: 'kind', label: 'Type de rendez-vous', type: 'select', options: ['Premier contact', 'Présentation', 'Closing', 'Formation', 'Suivi', 'Réunion avec l’administration'], required: true },
    { key: 'participant', label: 'Prospect ou participant', type: 'text' },
    { key: 'location', label: 'Lieu ou lien de réunion', type: 'text' },
    { key: 'result', label: 'Compte rendu', type: 'text' },
  ] },
  taches: { title: 'Intitulé de la tâche', detail: 'Instructions et résultat attendu', date: 'Échéance', fields: [
    { key: 'priority', label: 'Priorité', type: 'select', options: ['Normale', 'Haute', 'Basse'], required: true },
  ] },
  networkers: { title: 'Nom du networker', detail: 'Notes de suivi', date: 'Prochain suivi', fields: [
    { key: 'phone', label: 'Téléphone', type: 'tel' }, { key: 'sponsor', label: 'Parrain (nom)', type: 'text' },
  ] },
  formations: { title: 'Titre de la formation', detail: 'Description et contenu', date: 'Date de la séance', fields: [
    { key: 'format', label: 'Format', type: 'select', options: ['Présentiel', 'En ligne', 'Autonome'], required: true },
    { key: 'link', label: 'Lien du support', type: 'url' },
  ] },
  ressources: { title: 'Titre du support', detail: 'Description du support', date: 'Date de publication', fields: [
    { key: 'category', label: 'Catégorie', type: 'select', options: ['Produits', 'Présentation', 'Vidéo', 'Plan marketing', 'Packs et options', 'Autre'], required: true },
    { key: 'link', label: 'Lien du support', type: 'url' },
  ] },
  commandes: { title: 'Référence de commande', detail: 'Articles et remarques', date: 'Date de commande', fields: [
    { key: 'customer', label: 'Client', type: 'text', required: true }, { key: 'amount', label: 'Montant indicatif en TND', type: 'number' },
  ] },
  stock: { title: 'Nom du produit ou du pack', detail: 'Description et options', date: 'Date de mise à jour', fields: [
    { key: 'sku', label: 'Référence', type: 'text' }, { key: 'quantity', label: 'Quantité indicative', type: 'number' },
  ] },
};
export function validateExtra(section, extra, { required = true } = {}) {
  const form = businessForms[section];
  if (!form || !extra || typeof extra !== 'object' || Array.isArray(extra)) return 'Champs métier invalides';
  for (const key of Object.keys(extra)) if (!form.fields.some(field => field.key === key)) return 'Champ métier inconnu';
  for (const field of form.fields) {
    const value = extra[field.key] ?? '';
    if (typeof value !== 'string' || value.length > 500) return `${field.label} invalide`;
    if (required && field.required && !value.trim()) return `${field.label} requis`;
    if (value && field.type === 'select' && !field.options.includes(value)) return `${field.label} invalide`;
    if (value && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'E-mail invalide';
    if (value && field.type === 'url') { try { if (!['https:', 'http:'].includes(new URL(value).protocol)) return 'Lien invalide'; } catch { return 'Lien invalide'; } }
    if (value && field.type === 'number' && (!/^\d+(\.\d{1,3})?$/.test(value) || Number(value) > 100000000)) return `${field.label} invalide`;
  }
  return null;
}
