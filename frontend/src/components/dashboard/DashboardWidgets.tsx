import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { STATUS_LABEL } from '../../lib/labels';
import type { Task, TaskStats, TaskStatus } from '../../lib/types';
import { DueDateLabel, TaskPriorityBadge, TaskStatusBadge } from '../tasks/TaskBadges';

const STATUS_COLOR: Record<TaskStatus, string> = { TODO: 'var(--info)', IN_PROGRESS: 'var(--primary)', DONE: 'var(--success)' };

export function StatCard({ label, value, icon, tone, context, index = 0, className = '' }: { label: string; value: number; icon: ReactNode; tone: string; context?: string; index?: number; className?: string }) {
  return (
    <div style={{ ['--i' as string]: index }} className={`card group relative overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft-md sm:p-5 ${className}`}>
      <div className={`mb-3 flex size-10 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <p className="font-display text-[28px] leading-none font-bold text-ink tabular-nums sm:text-[32px]">{value}</p>
      <p className="mt-1.5 text-sm font-semibold text-muted">{label}</p>
      {context && <p className="mt-0.5 text-xs text-subtle">{context}</p>}
    </div>
  );
}

/** Progression réelle + équivalent textuel (llm.md 4.3). */
export function ProgressIndicator({ stats }: { stats: TaskStats }) {
  const rate = stats.completionRate;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id="progress-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--lavender)" />
              <stop offset="1" stopColor="var(--primary)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="url(#progress-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - rate / 100)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-ink tabular-nums">{formatRate(rate)}</span>
        </div>
      </div>
      <div className="flex-1 text-center sm:text-left">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rate}
          aria-valuetext={`${formatRate(rate)} — ${stats.done} sur ${stats.total} tâches terminées`}
          aria-label="Progression globale"
          className="h-2.5 w-full overflow-hidden rounded-full bg-sunken"
        >
          <div className="bg-brand-gradient h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${rate}%` }} />
        </div>
        <p className="mt-3 text-[15px] font-semibold text-ink">
          {stats.done} sur {stats.total} tâche{stats.total > 1 ? 's' : ''} terminée{stats.done > 1 ? 's' : ''}
        </p>
        <p className="mt-1 text-sm text-muted">
          {stats.total === 0 ? 'Pas encore de tâches.' : rate === 100 ? 'Tout est terminé, bravo !' : `${stats.total - stats.done} restent à accomplir.`}
        </p>
      </div>
    </div>
  );
}

export function formatRate(rate: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(rate)} %`;
}

/** Répartition par statut : anneau simple + légende + restitution textuelle. */
export function StatusDistributionChart({ stats }: { stats: TaskStats }) {
  const total = stats.total;
  const r = 44;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segments = (['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((s) => {
    const value = stats.statusDistribution[s];
    const length = total > 0 ? (value / total) * c : 0;
    const seg = { status: s, value, length, offset };
    offset += length;
    return seg;
  });
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  return (
    <figure className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 110 110" className="size-full -rotate-90" aria-hidden>
          <circle cx="55" cy="55" r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth="14" />
          {segments.map((s) =>
            s.length > 0 ? (
              <circle
                key={s.status}
                cx="55"
                cy="55"
                r={r}
                fill="none"
                stroke={STATUS_COLOR[s.status]}
                strokeWidth="14"
                strokeDasharray={`${Math.max(0, s.length - (segments.filter((x) => x.length > 0).length > 1 ? 2 : 0))} ${c}`}
                strokeDashoffset={-s.offset}
                className="transition-all duration-700 ease-out"
              />
            ) : null,
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-ink tabular-nums">{total}</span>
          <span className="text-xs text-muted">tâche{total > 1 ? 's' : ''}</span>
        </div>
      </div>
      <figcaption className="w-full flex-1">
        <span className="sr-only">Répartition des tâches par statut :</span>
        <ul className="flex flex-col gap-2.5">
          {segments.map((s) => (
            <li key={s.status} className="flex items-center gap-3 text-sm">
              <span className="size-3 shrink-0 rounded-full" style={{ background: STATUS_COLOR[s.status] }} aria-hidden />
              <span className="font-medium text-ink">{STATUS_LABEL[s.status]}</span>
              <span className="ml-auto font-semibold text-ink tabular-nums">{s.value}</span>
              <span className="w-11 text-right text-muted tabular-nums">{pct(s.value)} %</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

export function TaskMiniList({ tasks, onOpen }: { tasks: Task[]; onOpen(t: Task): void }) {
  return (
    <ul className="stagger flex flex-col divide-y divide-line">
      {tasks.map((task, i) => (
        <li key={task.id} style={{ ['--i' as string]: i }}>
          <button
            type="button"
            onClick={() => onOpen(task)}
            className="group flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-sunken focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{task.title}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-2">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
                <DueDateLabel task={task} />
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
