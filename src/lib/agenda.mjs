// Dates and times are local civil values, with no time-zone conversion.
export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function weekDays(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return Array.from({length: 7}, (_, index) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
    return localDateKey(day);
  });
}
export function appointmentsByDay(entries) {
  const days = {};
  for (const entry of entries) {
    if (entry.status === 'Annulé' || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(entry.date || '')) continue;
    const key = entry.date.slice(0, 10);
    (days[key] ??= []).push(entry);
  }
  for (const entries of Object.values(days)) entries.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  return days;
}
export function appointmentHour(date) {
  const match = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d/.exec(date || '');
  return match ? Number(match[1]) : null;
}
