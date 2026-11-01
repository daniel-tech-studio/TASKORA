import { buildSearchText, normalizeSearch, PRIORITY_RANK } from './task.constants';

describe('task.constants', () => {
  it('ordre sémantique des priorités', () => {
    expect(PRIORITY_RANK.LOW).toBeLessThan(PRIORITY_RANK.MEDIUM);
    expect(PRIORITY_RANK.MEDIUM).toBeLessThan(PRIORITY_RANK.HIGH);
  });
  it('normalisation insensible à la casse et aux accents', () => {
    expect(normalizeSearch('ÉtÉ Préparé Ça')).toBe('ete prepare ca');
    expect(buildSearchText('Titre', null)).toBe('titre');
    expect(buildSearchText('Titre', 'Détails')).toBe('titre\ndetails');
  });
});
