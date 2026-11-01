import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Columns3, LayoutList, Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState, ErrorState, LoadingRegion } from '../components/ui/Feedback';
import { EmptyTasksIllustration, NoResultsIllustration } from '../components/illustrations/Illustrations';
import { CLEARED_FILTERS, FilterBar, activeFilterCount, type ListFilters } from '../components/tasks/FilterBar';
import { TaskCard, TaskCardSkeleton } from '../components/tasks/TaskCard';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { useTaskList, useUpdateTask, type TaskFilters } from '../lib/queries';
import { useTaskUi } from '../lib/task-ui';
import { useToast } from '../lib/toast';
import { errorMessage } from '../lib/api/errors';
import { STATUS_LABEL } from '../lib/labels';
import type { DueFilter, SortField, Task, TaskPriority, TaskStatus } from '../lib/types';

type View = 'liste' | 'kanban';

const STATUS_VALUES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH'];
const DUE_VALUES = ['all', 'withDate', 'withoutDate', 'overdue'];
const SORT_VALUES = ['createdAt', 'dueDate', 'priority', 'title'];

/** Filtres synchronisés à l'URL : partageables et conservés après actualisation. */
function readFilters(params: URLSearchParams): ListFilters {
  const pick = <T extends string>(key: string, allowed: string[], fallback: T): T => {
    const v = params.get(key) ?? '';
    return (allowed.includes(v) ? v : fallback) as T;
  };
  return {
    search: (params.get('q') ?? '').slice(0, 100),
    status: pick<TaskStatus | ''>('statut', STATUS_VALUES, ''),
    priority: pick<TaskPriority | ''>('priorite', PRIORITY_VALUES, ''),
    due: pick<DueFilter>('echeance', DUE_VALUES, 'all'),
    sortBy: pick<SortField>('tri', SORT_VALUES, 'createdAt'),
    sortOrder: params.get('ordre') === 'asc' ? 'asc' : 'desc',
  };
}

function writeFilters(params: URLSearchParams, f: ListFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  const put = (key: string, value: string, fallback: string) => (value && value !== fallback ? next.set(key, value) : next.delete(key));
  put('q', f.search.trim(), '');
  put('statut', f.status, '');
  put('priorite', f.priority, '');
  put('echeance', f.due, 'all');
  put('tri', f.sortBy, 'createdAt');
  put('ordre', f.sortOrder, 'desc');
  return next;
}

function toQuery(f: ListFilters, includeStatus: boolean): TaskFilters {
  return {
    search: f.search.trim() || undefined,
    status: includeStatus && f.status ? f.status : undefined,
    priority: f.priority || undefined,
    due: f.due,
    sortBy: f.sortBy,
    sortOrder: f.sortOrder,
  };
}

/** E04 — Mes tâches, onglets Liste / Kanban (?vue=liste|kanban). */
export function TasksPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('vue') === 'kanban' ? 'kanban' : 'liste';
  const filters = useMemo(() => readFilters(params), [params]);
  const { openCreate } = useTaskUi();

  // Les navigations de React Router sont différées (transitions) : chaque modification partielle
  // est fusionnée dans les derniers paramètres écrits, jamais dans un rendu potentiellement périmé.
  const latest = useRef(params);
  latest.current = params;
  const setFilters = useCallback(
    (patch: Partial<ListFilters>) => {
      const next = writeFilters(latest.current, { ...readFilters(latest.current), ...patch });
      latest.current = next;
      setParams(next, { replace: true });
    },
    [setParams],
  );
  const setView = (v: View) =>
    {
      const next = new URLSearchParams(latest.current);
      next.set('vue', v);
      latest.current = next;
      setParams(next);
    };

  return (
    <>
      <PageHeader
        title="Mes tâches"
        subtitle="Retrouvez et organisez tout ce que vous avez à faire."
        action={
          <Button onClick={openCreate} icon={<Plus className="size-5" aria-hidden />}>
            Nouvelle tâche
          </Button>
        }
      />
      <div className="mb-4">
        <Tabs
          idPrefix="tasks-view"
          label="Affichage des tâches"
          value={view}
          onChange={setView}
          tabs={[
            { value: 'liste', label: 'Liste', icon: <LayoutList className="size-[18px]" aria-hidden /> },
            { value: 'kanban', label: 'Kanban', icon: <Columns3 className="size-[18px]" aria-hidden /> },
          ]}
        />
      </div>
      <div id="tasks-view-panel" role="tabpanel" aria-labelledby={`tasks-view-tab-${view}`} className="flex flex-col gap-4">
        {view === 'liste' ? <ListView filters={filters} onFilters={setFilters} /> : <KanbanView filters={filters} onFilters={setFilters} />}
      </div>
    </>
  );
}

function ListView({ filters, onFilters }: { filters: ListFilters; onFilters(patch: Partial<ListFilters>): void }) {
  const query = useTaskList(toQuery(filters, true));
  const update = useUpdateTask();
  const { openTask, openCreate } = useTaskUi();
  const toast = useToast();
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.pagination.total;
  const filtered = activeFilterCount(filters, true) > 0;

  const changeStatus = async (task: Task, status: TaskStatus) => {
    try {
      await update.mutateAsync({ id: task.id, patch: { status }, previous: task });
      toast.success(`Statut mis à jour : ${STATUS_LABEL[status]}`);
    } catch (error) {
      toast.error(`Statut non modifié : ${errorMessage(error)}`);
    }
  };

  return (
    <>
      <FilterBar filters={filters} onChange={onFilters} showStatus resultCount={query.isPlaceholderData ? undefined : total} />
      {query.isPending ? (
        <LoadingRegion label="Chargement des tâches">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        </LoadingRegion>
      ) : query.isError ? (
        <div className="card">
          <ErrorState message={errorMessage(query.error, 'Impossible de charger vos tâches.')} onRetry={() => void query.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <div className="card halo-bg">
          {filtered ? (
            <EmptyState
              illustration={<NoResultsIllustration />}
              title="Aucune tâche trouvée"
              description="Aucune tâche ne correspond à votre recherche ou à vos filtres."
              action={
                <Button variant="secondary" onClick={() => onFilters(CLEARED_FILTERS)}>
                  Effacer les filtres
                </Button>
              }
            />
          ) : (
            <EmptyState
              illustration={<EmptyTasksIllustration />}
              title="Une page blanche pour vos projets du jour"
              description="Ajoutez votre première tâche : un titre suffit pour commencer."
              action={
                <Button onClick={openCreate} icon={<Plus className="size-5" aria-hidden />}>
                  Créer ma première tâche
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <>
          {!filtered && total !== undefined && (
            <p className="px-1 text-sm text-muted">
              {total} tâche{total > 1 ? 's' : ''} au total
            </p>
          )}
          <ul className={`stagger grid gap-3 transition-opacity sm:gap-4 md:grid-cols-2 xl:grid-cols-3 ${query.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={query.isFetching || undefined}>
            {items.map((task, i) => (
              <li key={task.id} className="flex" style={{ ['--i' as string]: i }}>
                <div className="h-full w-full">
                  <TaskCard task={task} index={i} onOpen={openTask} onStatusChange={changeStatus} pending={update.isPending && update.variables?.id === task.id} />
                </div>
              </li>
            ))}
          </ul>
          {query.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" loading={query.isFetchingNextPage} loadingText="Chargement…" onClick={() => void query.fetchNextPage()}>
                Afficher plus de tâches ({(total ?? 0) - items.length} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function KanbanView({ filters, onFilters }: { filters: ListFilters; onFilters(patch: Partial<ListFilters>): void }) {
  return (
    <>
      <FilterBar filters={filters} onChange={onFilters} showStatus={false} />
      <KanbanBoard filters={toQuery(filters, false)} />
    </>
  );
}
