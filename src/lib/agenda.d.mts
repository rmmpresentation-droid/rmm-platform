export function localDateKey(date: Date): string;
export function weekDays(date: Date): string[];
export function appointmentsByDay<T extends { date: string; status: string; title: string }>(entries: T[]): Record<string, T[]>;
export function appointmentHour(date: string): number | null;
export function inPlanningHours(date: string): boolean;
