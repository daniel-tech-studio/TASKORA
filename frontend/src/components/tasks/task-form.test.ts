import { EMPTY_TASK, isDirty, toInput, validateTask } from './task-form';

describe('formulaire de tâche', () => {
  it('titre requis et non blanc, longueurs maximales, date réelle', () => {
    expect(validateTask({ ...EMPTY_TASK, title: '   ' }).title).toBeDefined();
    expect(validateTask({ ...EMPTY_TASK, title: 'a'.repeat(151) }).title).toBeDefined();
    expect(validateTask({ ...EMPTY_TASK, title: 'a'.repeat(150) }).title).toBeUndefined();
    expect(validateTask({ ...EMPTY_TASK, title: 'x', description: 'd'.repeat(2001) }).description).toBeDefined();
    expect(validateTask({ ...EMPTY_TASK, title: 'x', dueDate: '2026-02-30' }).dueDate).toBeDefined();
    expect(validateTask({ ...EMPTY_TASK, title: 'x', dueDate: '2028-02-29' })).toEqual({});
  });

  it('échéance facultative : vide → null ; description vide → null', () => {
    expect(toInput({ ...EMPTY_TASK, title: '  Titre  ', description: '   ' })).toEqual({
      title: 'Titre',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: null,
    });
  });

  it('détection des modifications', () => {
    expect(isDirty(EMPTY_TASK, { ...EMPTY_TASK })).toBe(false);
    expect(isDirty(EMPTY_TASK, { ...EMPTY_TASK, priority: 'HIGH' })).toBe(true);
  });
});
