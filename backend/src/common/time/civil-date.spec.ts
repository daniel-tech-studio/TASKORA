import { isOverdue, isValidCivilDate, isValidTimeZone, todayInTimeZone } from './civil-date';

describe('civil-date', () => {
  it.each([
    ['2026-11-12', true], ['2028-02-29', true], ['2026-02-29', false], ['2026-02-30', false], ['2026-04-31', false],
    ['2026-13-01', false], ['2026-00-10', false], ['2026-1-01', false], ['2026-11-12T00:00:00Z', false], ['1899-12-31', false], ['', false],
  ])('isValidCivilDate(%s) = %s', (value, expected) => expect(isValidCivilDate(value)).toBe(expected));

  it('valide les fuseaux IANA', () => {
    expect(isValidTimeZone('Africa/Porto-Novo')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  it('calcule la date du jour dans le fuseau (frontières jour/année, heure d’été)', () => {
    expect(todayInTimeZone(new Date('2026-11-01T23:30:00Z'), 'Africa/Porto-Novo')).toBe('2026-11-02');
    expect(todayInTimeZone(new Date('2026-11-01T23:30:00Z'), 'UTC')).toBe('2026-11-01');
    expect(todayInTimeZone(new Date('2026-12-31T23:00:00Z'), 'Europe/Paris')).toBe('2027-01-01');
    expect(todayInTimeZone(new Date('2026-01-01T04:00:00Z'), 'America/New_York')).toBe('2025-12-31');
    expect(todayInTimeZone(new Date('2026-03-29T01:30:00Z'), 'Europe/Paris')).toBe('2026-03-29'); // passage à l'heure d'été
    expect(todayInTimeZone(new Date('2026-11-01T12:00:00Z'), 'Invalide/Zone')).toBe('2026-11-01'); // repli UTC
  });

  it('retard : non terminée, échéance strictement passée', () => {
    expect(isOverdue('TODO', '2026-10-31', '2026-11-01')).toBe(true);
    expect(isOverdue('IN_PROGRESS', '2026-10-31', '2026-11-01')).toBe(true);
    expect(isOverdue('DONE', '2026-10-31', '2026-11-01')).toBe(false);
    expect(isOverdue('TODO', '2026-11-01', '2026-11-01')).toBe(false);
    expect(isOverdue('TODO', null, '2026-11-01')).toBe(false);
  });
});
