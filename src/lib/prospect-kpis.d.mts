export const prospectKpiGroups: { key: string; label: string; statuses: string[] | null }[];
export function matchesProspectKpi(prospect: { status: string }, key: string): boolean;
export function countProspectKpis(prospects: { status: string }[]): Record<string, number>;
