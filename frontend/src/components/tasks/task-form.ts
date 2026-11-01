import type { TaskInput } from '../../lib/types';

export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 2000;

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskInput['status'];
  priority: TaskInput['priority'];
  dueDate: string;
}

export type TaskFormErrors = Partial<Record<keyof TaskFormValues, string>>;

export const EMPTY_TASK: TaskFormValues = { title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '' };

/** Mêmes règles que le service (backend.md C1/D4) : titre 1–150 non blanc, description ≤ 2000, date réelle. */
export function validateTask(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = 'Le titre est obligatoire.';
  else if (title.length > TITLE_MAX) errors.title = `Le titre doit contenir au plus ${TITLE_MAX} caractères.`;
  if (values.description.length > DESCRIPTION_MAX) errors.description = `La description doit contenir au plus ${DESCRIPTION_MAX} caractères.`;
  if (values.dueDate && !isRealDate(values.dueDate)) errors.dueDate = 'Saisissez une date valide.';
  return errors;
}

function isRealDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900) return false;
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

export function toInput(values: TaskFormValues): TaskInput {
  const description = values.description.trim();
  return {
    title: values.title.trim(),
    description: description ? values.description : null,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate || null,
  };
}

export function isDirty(a: TaskFormValues, b: TaskFormValues): boolean {
  return (Object.keys(a) as (keyof TaskFormValues)[]).some((k) => a[k] !== b[k]);
}

/** Erreurs de validation renvoyées par le service, rattachées aux champs du formulaire. */
export function serverFieldErrors(details: Record<string, string[]>): TaskFormErrors {
  const out: TaskFormErrors = {};
  for (const key of ['title', 'description', 'status', 'priority', 'dueDate'] as const) {
    if (details[key]?.[0]) out[key] = details[key][0];
  }
  return out;
}
