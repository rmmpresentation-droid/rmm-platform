/** Calendar dates are local civil dates, not UTC timestamps. */
export function monthDays(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return [...Array(offset).fill(null), ...Array.from({length: count}, (_, i) => `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)];
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
