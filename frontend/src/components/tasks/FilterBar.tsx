import { useEffect, useId, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { DUE_LABEL, PRIORITIES, PRIORITY_LABEL, SORT_LABEL, STATUSES, STATUS_LABEL } from '../../lib/labels';
import type { DueFilter, SortField, SortOrder, TaskPriority, TaskStatus } from '../../lib/types';

export interface ListFilters {
  search: string;
  status: TaskStatus | '';
  priority: TaskPriority | '';
  due: DueFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
}

export const DEFAULT_FILTERS: ListFilters = { search: '', status: '', priority: '', due: 'all', sortBy: 'createdAt', sortOrder: 'desc' };

/** Réinitialisation : filtres effacés, tri conservé. */
export const CLEARED_FILTERS: Partial<ListFilters> = { search: '', status: '', priority: '', due: 'all' };

export function activeFilterCount(f: ListFilters, includeStatus: boolean): number {
  return (f.search.trim() ? 1 : 0) + (includeStatus && f.status ? 1 : 0) + (f.priority ? 1 : 0) + (f.due !== 'all' ? 1 : 0);
}

function MiniSelect<T extends string>({ label, value, options, onChange, active }: { label: string; value: T; options: { value: T; label: string }[]; onChange(v: T): void; active: boolean }) {
  const id = useId();
  return (
    <div className="relative min-w-0 flex-1 sm:flex-none">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`h-11 w-full appearance-none rounded-xl border pr-9 pl-3.5 text-sm font-semibold transition outline-none focus:border-brand focus:ring-4 focus:ring-brand/15 sm:w-auto ${
          active ? 'border-brand/50 bg-brand-soft text-brand-soft-ink' : 'border-line-strong bg-surface text-ink hover:border-brand/40'
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}

/**
 * Barre d'outils de Mes tâches (llm.md E04) : recherche, filtres Statut / Priorité / Échéance,
 * tri, réinitialisation. Sur mobile, les filtres se replient dans un panneau dépliable.
 */
export function FilterBar({ filters, onChange, showStatus, resultCount }: { filters: ListFilters; onChange(patch: Partial<ListFilters>): void; showStatus: boolean; resultCount?: number }) {
  const searchId = useId();
  const [search, setSearch] = useState(filters.search);
  const [expanded, setExpanded] = useState(false);
  const count = activeFilterCount(filters, showStatus);

  // Recherche différée (300 ms) pour éviter une requête par frappe.
  useEffect(() => setSearch(filters.search), [filters.search]);
  useEffect(() => {
    if (search === filters.search) return;
    const t = window.setTimeout(() => onChange({ search }), 300);
    return () => window.clearTimeout(t);
  }, [search, filters, onChange]);

  const set = <K extends keyof ListFilters>(key: K, value: ListFilters[K]) => onChange({ [key]: value } as Partial<ListFilters>);

  return (
    <div className="card flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            Rechercher une tâche
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-subtle" aria-hidden />
          <input
            id={searchId}
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une tâche…"
            className="h-11 w-full rounded-xl border border-line-strong bg-surface pr-10 pl-10 text-[15px] text-ink transition outline-none placeholder:text-subtle hover:border-brand/40 focus:border-brand focus:ring-4 focus:ring-brand/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                onChange({ search: '' });
              }}
              className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
              aria-label="Effacer la recherche"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <Button
          variant={count > 0 ? 'soft' : 'secondary'}
          className="sm:hidden"
          aria-expanded={expanded}
          aria-controls={`${searchId}-filters`}
          onClick={() => setExpanded((e) => !e)}
          icon={<SlidersHorizontal className="size-[18px]" aria-hidden />}
        >
          Filtres{count > 0 ? ` (${count})` : ''}
        </Button>
      </div>

      <div id={`${searchId}-filters`} className={`${expanded ? 'flex' : 'hidden'} flex-col gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center`}>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {showStatus && (
            <MiniSelect
              label="Filtrer par statut"
              value={filters.status}
              active={Boolean(filters.status)}
              onChange={(v) => set('status', v)}
              options={[{ value: '' as const, label: 'Tous les statuts' }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
            />
          )}
          <MiniSelect
            label="Filtrer par priorité"
            value={filters.priority}
            active={Boolean(filters.priority)}
            onChange={(v) => set('priority', v)}
            options={[{ value: '' as const, label: 'Toutes priorités' }, ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))]}
          />
          <MiniSelect
            label="Filtrer par échéance"
            value={filters.due}
            active={filters.due !== 'all'}
            onChange={(v) => set('due', v)}
            options={(Object.keys(DUE_LABEL) as DueFilter[]).map((d) => ({ value: d, label: DUE_LABEL[d] }))}
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <MiniSelect
            label="Trier par"
            value={filters.sortBy}
            active={false}
            onChange={(v) => set('sortBy', v)}
            options={(Object.keys(SORT_LABEL) as SortField[]).map((s) => ({ value: s, label: `Tri : ${SORT_LABEL[s]}` }))}
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={() => set('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label={filters.sortOrder === 'asc' ? 'Ordre croissant (inverser)' : 'Ordre décroissant (inverser)'}
            title={filters.sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
          >
            {filters.sortOrder === 'asc' ? <ArrowUpNarrowWide className="size-[18px]" aria-hidden /> : <ArrowDownWideNarrow className="size-[18px]" aria-hidden />}
          </Button>
          {count > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                onChange(CLEARED_FILTERS);
              }}
              icon={<RotateCcw className="size-4" aria-hidden />}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>
      {resultCount !== undefined && count > 0 && (
        <p className="px-1 text-sm text-muted" role="status">
          {resultCount === 0 ? 'Aucun résultat' : `${resultCount} tâche${resultCount > 1 ? 's' : ''} correspondante${resultCount > 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  );
}
