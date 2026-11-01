import { AlarmClock, ArrowDown, ArrowUp, CalendarDays, CheckCircle2, Circle, Equal, Loader } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../lib/labels';
import { formatCivilLong, formatDueShort } from '../../lib/dates';
import type { Task, TaskPriority, TaskStatus } from '../../lib/types';

const STATUS_TONE = { TODO: 'info', IN_PROGRESS: 'brand', DONE: 'success' } as const;
const STATUS_ICON = { TODO: Circle, IN_PROGRESS: Loader, DONE: CheckCircle2 };
const PRIORITY_TONE = { LOW: 'neutral', MEDIUM: 'warning', HIGH: 'danger' } as const;
const PRIORITY_ICON = { LOW: ArrowDown, MEDIUM: Equal, HIGH: ArrowUp };

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <Badge tone={STATUS_TONE[status]} icon={<Icon className="size-3.5" aria-hidden />}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <Badge tone={PRIORITY_TONE[priority]} icon={<Icon className="size-3.5" aria-hidden />}>
      <span className="sr-only">Priorité </span>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

/** Échéance : « Sans échéance » n'est jamais un retard ; le retard n'existe que hors Terminée. */
export function DueDateLabel({ task, showEmpty = false }: { task: Pick<Task, 'dueDate' | 'isOverdue' | 'status'>; showEmpty?: boolean }) {
  if (!task.dueDate) {
    return showEmpty ? <span className="text-xs font-medium text-subtle">Sans échéance</span> : null;
  }
  if (task.isOverdue && task.status !== 'DONE') {
    return (
      <Badge tone="danger" icon={<AlarmClock className="size-3.5" aria-hidden />} className="ring-1 ring-danger/25">
        <span>
          En retard · <time dateTime={task.dueDate}>{formatDueShort(task.dueDate)}</time>
        </span>
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted" title={formatCivilLong(task.dueDate)}>
      <CalendarDays className="size-3.5" aria-hidden />
      <span className="sr-only">Échéance </span>
      <time dateTime={task.dueDate}>{formatDueShort(task.dueDate)}</time>
    </span>
  );
}
