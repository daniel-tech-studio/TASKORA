/**
 * Dates civiles (YYYY-MM-DD) et fuseaux IANA — backend.md C4.
 * Les échéances ne sont jamais converties en instants : seule la comparaison
 * lexicographique de chaînes ISO est utilisée, ce qui est exact pour ce format.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidCivilDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 1900 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Date civile du jour dans le fuseau donné, au format YYYY-MM-DD. */
export function todayInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Une tâche est en retard si non terminée, avec échéance strictement antérieure à aujourd'hui. */
export function isOverdue(status: string, dueDate: string | null, today: string): boolean {
  return status !== 'DONE' && dueDate !== null && dueDate < today;
}
