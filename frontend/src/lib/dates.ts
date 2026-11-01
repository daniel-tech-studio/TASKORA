/**
 * Dates d'échéance : chaînes civiles YYYY-MM-DD affichées comme dates calendaires locales,
 * sans jamais passer par minuit UTC (llm.md 6.2 — pas de décalage d'un jour).
 */

export function parseCivil(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toCivil(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayCivil(now = new Date()): string {
  return toCivil(now);
}

function addDays(civil: string, days: number): string {
  const date = parseCivil(civil);
  date.setDate(date.getDate() + days);
  return toCivil(date);
}

const longFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const shortYearFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export function formatCivilLong(value: string): string {
  return longFmt.format(parseCivil(value));
}

/** Libellé relatif court : « Aujourd'hui », « Demain », « Hier », sinon « 12 nov. ». */
export function formatDueShort(value: string, now = new Date()): string {
  const today = todayCivil(now);
  if (value === today) return "Aujourd'hui";
  if (value === addDays(today, 1)) return 'Demain';
  if (value === addDays(today, -1)) return 'Hier';
  const date = parseCivil(value);
  return date.getFullYear() === now.getFullYear() ? shortFmt.format(date) : shortYearFmt.format(date);
}

export function formatInstant(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
