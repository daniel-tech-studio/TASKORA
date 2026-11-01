import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, MouseSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { GripVertical, MoveHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/Feedback';
import { DueDateLabel, TaskPriorityBadge } from './TaskBadges';
import { StatusSelect } from './StatusSelect';
import { STATUSES, STATUS_LABEL } from '../../lib/labels';
import { useKanbanColumn, useUpdateTask, type TaskFilters } from '../../lib/queries';
import { useTaskUi } from '../../lib/task-ui';
import { useToast } from '../../lib/toast';
import { errorMessage } from '../../lib/api/errors';
import type { Task, TaskStatus } from '../../lib/types';

const COLUMN_ACCENT: Record<TaskStatus, string> = { TODO: 'bg-info', IN_PROGRESS: 'bg-brand', DONE: 'bg-success' };

/**
 * V01 — Kanban : trois colonnes paginées indépendamment. Drag-and-drop à la souris uniquement
 * (aucun geste imposé au tactile) ; chaque carte offre un sélecteur de statut accessible.
 */
export function KanbanBoard({ filters }: { filters: TaskFilters }) {
  const update = useUpdateTask();
  const toast = useToast();
  const [active, setActive] = useState<Task | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }));

  const move = async (task: Task, status: TaskStatus) => {
    if (task.status === status) return;
    try {
      await update.mutateAsync({ id: task.id, patch: { status }, previous: task });
      toast.announce(`« ${task.title} » déplacée vers ${STATUS_LABEL[status]}.`);
    } catch (error) {
      // L'état précédent est restauré par la mutation (retour arrière optimiste).
      toast.error(`Déplacement impossible : ${errorMessage(error)}`);
    }
  };

  const onDragStart = (e: DragStartEvent) => setActive((e.active.data.current?.task as Task) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const task = e.active.data.current?.task as Task | undefined;
    const target = e.over?.id as TaskStatus | undefined;
    if (task && target) void move(task, target);
  };

  return (
    <DndContext
      sensors={sensors}
      // La colonne visée est celle sous le pointeur : intuitif et indépendant de la taille de la carte.
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
      accessibility={{
        screenReaderInstructions: { draggable: 'Utilisez le sélecteur de statut de la carte pour la déplacer au clavier.' },
        announcements: {
          onDragStart: () => 'Déplacement commencé.',
          onDragOver: ({ over }) => (over ? `Au-dessus de la colonne ${STATUS_LABEL[over.id as TaskStatus]}.` : 'Hors des colonnes.'),
          onDragEnd: ({ over }) => (over ? `Déposée dans ${STATUS_LABEL[over.id as TaskStatus]}.` : 'Déplacement annulé.'),
          onDragCancel: () => 'Déplacement annulé.',
        },
      }}
    >
      <div className="mb-3 flex items-center gap-2 md:hidden">
        <MoveHorizontal className="size-4 shrink-0 text-subtle" aria-hidden />
        <p className="text-[13px] text-muted">Faites défiler horizontalement pour parcourir les colonnes.</p>
      </div>
      <div className="mb-3 flex gap-2 md:hidden" aria-label="Aller à une colonne">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink"
            onClick={() => scrollerRef.current?.querySelector(`[data-column="${s}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })}
          >
            <span className={`size-2 rounded-full ${COLUMN_ACCENT[s]}`} aria-hidden />
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <div
        ref={scrollerRef}
        className="scrollbar-soft -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-4 md:mx-0 md:grid md:snap-none md:grid-cols-3 md:overflow-visible md:px-0"
      >
        {STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} filters={filters} onMove={move} pendingId={update.isPending ? update.variables?.id : undefined} />
        ))}
      </div>
      {/* Portail : l'aperçu en position fixe ne doit dépendre d'aucun ancêtre transformé/animé. */}
      {createPortal(
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {active ? <KanbanCardView task={active} overlay /> : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}

function KanbanColumn({ status, filters, onMove, pendingId }: { status: TaskStatus; filters: TaskFilters; onMove(t: Task, s: TaskStatus): void; pendingId?: string }) {
  const query = useKanbanColumn(status, filters);
  const { setNodeRef, isOver, active } = useDroppable({ id: status });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.pagination.total ?? 0;
  const dragging = Boolean(active);
  const sourceStatus = (active?.data.current?.task as Task | undefined)?.status;
  const headingId = `kanban-${status}`;

  return (
    <section
      ref={setNodeRef}
      data-column={status}
      aria-labelledby={headingId}
      className={`flex w-[82vw] max-w-[360px] shrink-0 snap-start flex-col rounded-[20px] border p-3 transition duration-200 sm:w-[320px] md:w-auto md:max-w-none ${
        isOver && sourceStatus !== status
          ? 'border-brand bg-brand-soft/70 ring-4 ring-brand/15'
          : dragging && sourceStatus !== status
            ? 'border-dashed border-brand/50 bg-sunken'
            : 'border-line bg-sunken/70'
      }`}
    >
      <header className="mb-3 flex items-center gap-2 px-1.5 pt-1">
        <span className={`size-2.5 rounded-full ${COLUMN_ACCENT[status]}`} aria-hidden />
        <h2 id={headingId} className="font-display text-[15px] font-semibold text-ink">
          {STATUS_LABEL[status]}
        </h2>
        <span className="ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-surface px-2 text-xs font-bold text-muted ring-1 ring-line" aria-label={`${total} tâche${total > 1 ? 's' : ''}`}>
          {query.isPending ? '…' : total}
        </span>
      </header>

      <div className="flex min-h-40 flex-1 flex-col gap-2.5">
        {query.isPending ? (
          <div role="status" aria-label={`Chargement de la colonne ${STATUS_LABEL[status]}`} className="flex flex-col gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-24 rounded-[14px]" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState compact message={errorMessage(query.error, 'Colonne indisponible.')} onRetry={() => void query.refetch()} />
        ) : items.length === 0 ? (
          <div className={`flex flex-1 flex-col items-center justify-center rounded-[14px] border border-dashed px-4 py-8 text-center text-sm ${isOver ? 'border-brand text-brand' : 'border-line-strong text-subtle'}`}>
            {dragging ? 'Déposer ici' : 'Aucune tâche'}
          </div>
        ) : (
          <ul className="stagger flex flex-col gap-2.5">
            {items.map((task, i) => (
              <li key={task.id} style={{ ['--i' as string]: i }}>
                <DraggableCard task={task} onMove={onMove} pending={pendingId === task.id} />
              </li>
            ))}
          </ul>
        )}
        {query.hasNextPage && (
          <Button variant="ghost" size="sm" loading={query.isFetchingNextPage} loadingText="Chargement…" onClick={() => void query.fetchNextPage()} className="mt-1 self-center">
            Afficher plus ({total - items.length} restantes)
          </Button>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ task, onMove, pending }: { task: Task; onMove(t: Task, s: TaskStatus): void; pending: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } });
  // Le glisser se fait à la souris ; le rôle « button » de dnd-kit est retiré : l'ouverture
  // passe par le titre, le déplacement clavier par le sélecteur de statut.
  const { role: _role, tabIndex: _tab, ...dragAttributes } = attributes;
  return (
    <div ref={setNodeRef} {...listeners} {...dragAttributes} className={`touch-pan-y ${isDragging ? 'opacity-35' : ''}`}>
      <KanbanCardView task={task} onMove={onMove} pending={pending} />
    </div>
  );
}

function KanbanCardView({ task, onMove, pending, overlay }: { task: Task; onMove?(t: Task, s: TaskStatus): void; pending?: boolean; overlay?: boolean }) {
  const { openTask } = useTaskUi();
  return (
    <article
      className={`group relative flex flex-col gap-2.5 rounded-[14px] border bg-surface p-3.5 transition duration-200 md:cursor-grab ${
        overlay ? 'rotate-[1.5deg] cursor-grabbing border-brand/50 shadow-soft-lg ring-4 ring-brand/10' : 'shadow-soft-sm hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-soft-md'
      } ${task.isOverdue ? 'border-danger/30' : 'border-line'} ${pending ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => openTask(task)}
            className={`text-left text-[15px] leading-snug font-semibold break-words text-ink outline-none hover:text-brand focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring ${task.status === 'DONE' ? 'text-muted line-through decoration-muted/50' : ''}`}
          >
            <span className="line-clamp-3">{task.title}</span>
          </button>
        </h3>
        <GripVertical className="mt-0.5 hidden size-4 shrink-0 text-subtle opacity-0 transition group-hover:opacity-100 md:block" aria-hidden />
      </div>
      {task.description && <p className="line-clamp-2 text-[13px] break-words text-muted">{task.description}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <TaskPriorityBadge priority={task.priority} />
        <DueDateLabel task={task} />
      </div>
      {onMove && (
        <div className="flex items-center justify-end border-t border-line pt-2.5">
          <StatusSelect value={task.status} taskTitle={task.title} disabled={pending} onChange={(s) => onMove(task, s)} />
        </div>
      )}
    </article>
  );
}
