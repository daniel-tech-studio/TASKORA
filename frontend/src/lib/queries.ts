import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { tasksApi } from './api/endpoints';
import type { Task, TaskInput, TaskPage, TaskPatch, TaskQuery, TaskStatus } from './types';

export const PAGE_SIZE = 20;

export type TaskFilters = Omit<TaskQuery, 'page' | 'limit' | 'status'> & { status?: TaskStatus };

export const taskKeys = {
  all: ['tasks'] as const,
  lists: ['tasks', 'list'] as const,
  list: (filters: TaskFilters) => ['tasks', 'list', filters] as const,
  columns: ['tasks', 'column'] as const,
  column: (status: TaskStatus, filters: TaskFilters) => ['tasks', 'column', status, filters] as const,
  stats: ['tasks', 'stats'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  dashboardHigh: ['tasks', 'dashboard', 'high'] as const,
  dashboardOverdue: ['tasks', 'dashboard', 'overdue'] as const,
};

type Pages = InfiniteData<TaskPage, number>;

const nextPage = (last: TaskPage) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined);

/** Vue Liste : pagination serveur, pages chargées à la demande (« Afficher plus »). */
export function useTaskList(filters: TaskFilters) {
  return useInfiniteQuery({
    queryKey: taskKeys.list(filters),
    queryFn: ({ pageParam, signal }) => tasksApi.list({ ...filters, page: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    placeholderData: keepPreviousData,
  });
}

/** Kanban : une requête paginée indépendante par colonne (backend.md D6). */
export function useKanbanColumn(status: TaskStatus, filters: TaskFilters) {
  const { status: _ignored, ...shared } = filters;
  return useInfiniteQuery({
    queryKey: taskKeys.column(status, shared),
    queryFn: ({ pageParam, signal }) => tasksApi.list({ ...shared, status, page: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    placeholderData: keepPreviousData,
  });
}

export function useTaskStats() {
  return useQuery({ queryKey: taskKeys.stats, queryFn: ({ signal }) => tasksApi.stats(signal) });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ''),
    queryFn: ({ signal }) => tasksApi.get(id!, signal),
    enabled: Boolean(id),
  });
}

const DASHBOARD_LIMIT = 5;

/** Tâches prioritaires = Haute, non terminées : deux appels filtrés (TODO, IN_PROGRESS) fusionnés. */
export function useHighPriorityTasks() {
  return useQuery({
    queryKey: taskKeys.dashboardHigh,
    queryFn: async ({ signal }) => {
      const base = { priority: 'HIGH' as const, sortBy: 'dueDate' as const, sortOrder: 'asc' as const, limit: DASHBOARD_LIMIT };
      const [todo, doing] = await Promise.all([
        tasksApi.list({ ...base, status: 'TODO' }, signal),
        tasksApi.list({ ...base, status: 'IN_PROGRESS' }, signal),
      ]);
      const items = [...todo.items, ...doing.items].sort(byDueThenCreated).slice(0, DASHBOARD_LIMIT);
      return { items, total: todo.pagination.total + doing.pagination.total };
    },
  });
}

export function useOverdueTasks() {
  return useQuery({
    queryKey: taskKeys.dashboardOverdue,
    queryFn: async ({ signal }) => {
      const page = await tasksApi.list({ due: 'overdue', sortBy: 'dueDate', sortOrder: 'asc', limit: DASHBOARD_LIMIT }, signal);
      return { items: page.items, total: page.pagination.total };
    },
  });
}

function byDueThenCreated(a: Task, b: Task): number {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

// ------------------------------------------------------------------------------------------
// Mutations : toute mutation actualise Liste, Kanban et Dashboard (llm.md 1.5).
// ------------------------------------------------------------------------------------------

type Snapshot = [QueryKey, unknown][];

function snapshot(qc: QueryClient, key: QueryKey): Snapshot {
  return qc.getQueriesData({ queryKey: key });
}

function restore(qc: QueryClient, snap: Snapshot): void {
  for (const [key, data] of snap) qc.setQueryData(key, data);
}

function mapPages(data: Pages | undefined, fn: (items: Task[]) => Task[], totalDelta = 0): Pages | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page, index) => ({
      items: fn(page.items),
      pagination: { ...page.pagination, total: Math.max(0, page.pagination.total + (index === 0 ? totalDelta : 0)) },
    })),
  };
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => tasksApi.create(input),
    onSuccess: (task) => {
      qc.setQueryData(taskKeys.detail(task.id), task);
      return qc.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/** Modification (dont changement de statut) avec mise à jour optimiste et retour arrière si échec. */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatch; previous?: Task }) => tasksApi.update(id, patch),
    onMutate: async ({ id, patch, previous }) => {
      await qc.cancelQueries({ queryKey: taskKeys.all });
      const snap = [...snapshot(qc, taskKeys.lists), ...snapshot(qc, taskKeys.columns), ...snapshot(qc, taskKeys.detail(id))];
      const apply = (t: Task): Task => (t.id === id ? { ...t, ...patch, isOverdue: patch.status === 'DONE' ? false : t.isOverdue } : t);

      qc.setQueriesData<Pages>({ queryKey: taskKeys.lists }, (data) => mapPages(data, (items) => items.map(apply)));
      if (patch.status && previous && patch.status !== previous.status) {
        // Kanban : retirer de la colonne source, insérer en tête de la colonne cible.
        const moved = apply(previous);
        for (const [key] of snapshot(qc, taskKeys.columns)) {
          const status = key[2] as TaskStatus;
          qc.setQueryData<Pages>(key, (data) => {
            if (status === previous.status) return mapPages(data, (items) => items.filter((t) => t.id !== id), -1);
            if (status === patch.status) {
              return data ? { ...data, pages: data.pages.map((p, i) => (i === 0 ? { items: [moved, ...p.items], pagination: { ...p.pagination, total: p.pagination.total + 1 } } : p)) } : data;
            }
            return data;
          });
        }
      }
      return { snap };
    },
    onError: (_error, _vars, context) => {
      if (context) restore(qc, context.snap);
    },
    onSuccess: (task) => {
      qc.setQueryData(taskKeys.detail(task.id), task);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

/** Suppression : la tâche n'est retirée des vues qu'après confirmation du serveur (llm.md M02). */
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: async (_data, id) => {
      qc.removeQueries({ queryKey: taskKeys.detail(id) });
      await qc.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
