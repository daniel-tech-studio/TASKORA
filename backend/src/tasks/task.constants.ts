export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** Ordre sémantique LOW < MEDIUM < HIGH, persisté pour un tri SQL exact. */
export const PRIORITY_RANK: Record<TaskPriority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 2000;
export const SEARCH_MAX = 100;

/** Texte de recherche normalisé : minuscules, sans diacritiques. */
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function buildSearchText(title: string, description: string | null): string {
  return normalizeSearch(description ? `${title}\n${description}` : title);
}
