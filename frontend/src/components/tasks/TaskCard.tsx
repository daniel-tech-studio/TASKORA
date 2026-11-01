import { ChevronRight } from 'lucide-react';
import type { Task, TaskStatus } from '../../lib/types';
import { DueDateLabel, TaskPriorityBadge, TaskStatusBadge } from './TaskBadges';
import { StatusSelect } from './StatusSelect';

interface TaskCardProps {
  task: Task;
  onOpen(task: Task): void;
  onStatusChange(task: Task, status: TaskStatus): void;
  pending?: boolean;
  index?: number;
}

/**
 * Carte structurée de la vue Liste (llm.md E04). Le titre est le bouton d'ouverture
 * (étendu à la carte par un pseudo-élément) ; le contrôle de statut reste un élément distinct.
 */
export function TaskCard({ task, onOpen, onStatusChange, pending, index = 0 }: TaskCardProps) {
  const done = task.status === 'DONE';
  return (
    <article
      style={{ ['--i' as string]: index }}
      className={`group relative flex h-full flex-col gap-3 rounded-[16px] border bg-surface p-4 shadow-soft-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-soft-md sm:p-5 ${
        task.isOverdue ? 'border-danger/30' : 'border-line'
      } ${pending ? 'opacity-70' : ''}`}
    >
      {task.priority === 'HIGH' && !done && <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-danger/70" aria-hidden />}
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(task)}
            className={`text-left font-display text-[15px] leading-snug font-semibold break-words text-ink outline-none after:absolute after:inset-0 after:rounded-[16px] focus-visible:after:ring-2 focus-visible:after:ring-ring sm:text-base ${
              done ? 'text-muted line-through decoration-muted/50' : ''
            }`}
          >
            <span className="line-clamp-2">{task.title}</span>
          </button>
        </h3>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
      </div>
      {task.description && <p className="line-clamp-2 text-sm break-words text-muted">{task.description}</p>}
      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">
        <TaskPriorityBadge priority={task.priority} />
        <span className="hidden sm:inline-flex">
          <TaskStatusBadge status={task.status} />
        </span>
        <DueDateLabel task={task} />
        <div className="ml-auto">
          <StatusSelect value={task.status} taskTitle={task.title} disabled={pending} onChange={(s) => onStatusChange(task, s)} />
        </div>
      </div>
    </article>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-5">
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-full" />
      <div className="mt-2 flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton ml-auto h-9 w-28" />
      </div>
    </div>
  );
}
