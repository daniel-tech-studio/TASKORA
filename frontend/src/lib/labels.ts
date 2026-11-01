import type { DueFilter, SortField, TaskPriority, TaskStatus } from './types';

export const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
export const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

export const DUE_LABEL: Record<DueFilter, string> = {
  all: 'Toutes les échéances',
  withDate: 'Avec échéance',
  withoutDate: 'Sans échéance',
  overdue: 'En retard',
};

export const SORT_LABEL: Record<SortField, string> = {
  createdAt: 'Date de création',
  dueDate: 'Échéance',
  priority: 'Priorité',
  title: 'Titre',
};
