import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { STATUSES, STATUS_LABEL } from '../../lib/labels';
import type { TaskStatus } from '../../lib/types';

const DOT: Record<TaskStatus, string> = { TODO: 'bg-info', IN_PROGRESS: 'bg-brand', DONE: 'bg-success' };

/**
 * Contrôle de statut accessible (clavier, tactile, lecteurs d'écran) : alternative complète
 * au drag-and-drop du Kanban (llm.md V01). Sélecteur natif : jamais hors du viewport.
 */
export function StatusSelect({ value, onChange, taskTitle, disabled }: { value: TaskStatus; onChange(s: TaskStatus): void; taskTitle: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="relative inline-flex" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <label htmlFor={id} className="sr-only">
        Statut de « {taskTitle} »
      </label>
      <span className={`pointer-events-none absolute top-1/2 left-3 size-2 -translate-y-1/2 rounded-full ${DOT[value]}`} aria-hidden />
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as TaskStatus)}
        className="h-11 appearance-none rounded-xl border border-line-strong bg-surface pr-8 pl-7 text-[13px] font-semibold text-ink transition outline-none hover:border-brand/50 focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-60 sm:h-9"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}
