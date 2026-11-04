export function monthDays(year: number, month: number): (string | null)[];
export function appointmentsByDay<T extends { date: string; status: string; title: string }>(entries: T[]): Record<string, T[]>;
