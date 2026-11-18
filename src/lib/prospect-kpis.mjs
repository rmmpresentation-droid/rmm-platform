// Aggregates only records already returned by the server under the current user's access rights.
export const prospectKpiGroups = [
  { key: "all", label: "Tous les prospects", statuses: null },
  { key: "unstarted", label: "Non commencés", statuses: [""] },
  {
    key: "active",
    label: "En cours de suivi",
    statuses: [
      "Premier contact",
      "Prise de rendez-vous",
      "Présentation (nouvelle phase)",
      "Présentation",
      "Closing",
    ],
  },
  { key: "consumer", label: "Consommateurs", statuses: ["Consommateur"] },
  { key: "candidate", label: "Candidats networkers", statuses: ["Candidat networker"] },
  { key: "refused", label: "Sans commande", statuses: ["Sans commande"] },
];
export function matchesProspectKpi(prospect, key) {
  const group = prospectKpiGroups.find((item) => item.key === key);
  return Boolean(group && (group.statuses === null || group.statuses.includes(prospect.status)));
}
export function countProspectKpis(prospects) {
  return Object.fromEntries(
    prospectKpiGroups.map((group) => [
      group.key,
      prospects.filter((prospect) => matchesProspectKpi(prospect, group.key)).length,
    ]),
  );
}
