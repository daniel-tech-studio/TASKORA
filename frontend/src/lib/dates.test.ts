import { formatDueShort, parseCivil, toCivil, todayCivil } from './dates';

describe('dates civiles', () => {
  it('YYYY-MM-DD est interprétée comme date locale, sans décalage UTC', () => {
    const d = parseCivil('2026-11-12');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 12]);
    expect(toCivil(d)).toBe('2026-11-12');
  });

  it('libellés relatifs', () => {
    const now = new Date(2026, 10, 1, 23, 59);
    expect(todayCivil(now)).toBe('2026-11-01');
    expect(formatDueShort('2026-11-01', now)).toBe("Aujourd'hui");
    expect(formatDueShort('2026-11-02', now)).toBe('Demain');
    expect(formatDueShort('2026-10-31', now)).toBe('Hier');
    expect(formatDueShort('2026-11-12', now)).toMatch(/12 nov/);
    expect(formatDueShort('2027-01-05', now)).toMatch(/2027/);
  });
});
