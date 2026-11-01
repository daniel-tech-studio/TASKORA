import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Clock3, PencilLine, Trash2, X } from 'lucide-react';
import { Overlay } from '../ui/Overlay';
import { Button } from '../ui/Button';
import { ErrorState, InlineAlert, Skeleton } from '../ui/Feedback';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TaskFormFields } from './TaskFormFields';
import { DueDateLabel, TaskStatusBadge } from './TaskBadges';
import { isDirty, serverFieldErrors, toInput, validateTask, type TaskFormErrors, type TaskFormValues } from './task-form';
import { taskKeys, useDeleteTask, useTask, useUpdateTask } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { ApiError, errorMessage } from '../../lib/api/errors';
import { formatInstant } from '../../lib/dates';
import type { Task, TaskPatch } from '../../lib/types';

function toValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? '',
  };
}

/** Seuls les champs réellement modifiés sont envoyés (PATCH partiel, backend.md D4). */
function diff(task: Task, values: TaskFormValues): TaskPatch {
  const next = toInput(values);
  const patch: TaskPatch = {};
  if (next.title !== task.title) patch.title = next.title;
  if (next.description !== task.description) patch.description = next.description;
  if (next.status !== task.status) patch.status = next.status;
  if (next.priority !== task.priority) patch.priority = next.priority;
  if (next.dueDate !== task.dueDate) patch.dueDate = next.dueDate;
  return patch;
}

/**
 * P01 — Détails de la tâche. Convention retenue (llm.md P01) : édition directe clairement
 * signalée, dans le même panneau ; enregistrement explicite ; suppression via M02.
 */
export function TaskDetailDrawer({ taskId, initial, onClose }: { taskId: string | null; initial: Partial<Task> | null; onClose(): void }) {
  const open = Boolean(taskId);
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const query = useTask(taskId);
  const update = useUpdateTask();
  const remove = useDeleteTask();

  const task = query.data ?? (initial && 'title' in initial ? (initial as Task) : undefined);
  const [values, setValues] = useState<TaskFormValues | null>(null);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Réinitialise le formulaire à l'ouverture d'une autre tâche ; resynchronise si non modifié.
  useEffect(() => {
    setValues(null);
    setErrors({});
    setFormError(null);
    setConfirmDelete(false);
    setDeleteError(null);
  }, [taskId]);
  useEffect(() => {
    if (query.data && (!values || !isDirty(values, toValues(query.data)))) setValues(toValues(query.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);
  useEffect(() => {
    if (!values && task) setValues(toValues(task));
  }, [task, values]);

  // Tâche supprimée ou devenue inaccessible : fermer et actualiser (llm.md P01).
  const notFound = query.error instanceof ApiError && query.error.code === 'NOT_FOUND';
  useEffect(() => {
    if (!notFound) return;
    toast.info("Cette tâche n'existe plus.");
    void qc.invalidateQueries({ queryKey: taskKeys.all });
    onClose();
  }, [notFound, onClose, qc, toast]);

  const dirty = Boolean(task && values && isDirty(values, toValues(task)));

  const requestClose = () => {
    if (update.isPending || remove.isPending) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const onChange = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
    setValues((v) => (v ? { ...v, [key]: value } : v));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!task || !values || update.isPending) return;
    const found = validateTask(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    const patch = diff(task, values);
    if (Object.keys(patch).length === 0) return;
    try {
      const saved = await update.mutateAsync({ id: task.id, patch, previous: task });
      setValues(toValues(saved));
      toast.success('Modifications enregistrées');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'NOT_FOUND') {
        toast.info("Cette tâche n'existe plus.");
        onClose();
        return;
      }
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') setErrors(serverFieldErrors(error.details));
      setFormError(errorMessage(error, "Les modifications n'ont pas pu être enregistrées."));
    }
  };

  const doDelete = async () => {
    if (!task || remove.isPending) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync(task.id);
      setConfirmDelete(false);
      onClose();
      toast.success('Tâche supprimée');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'NOT_FOUND') {
        setConfirmDelete(false);
        onClose();
        toast.info("Cette tâche avait déjà été supprimée.");
        void qc.invalidateQueries({ queryKey: taskKeys.all });
        return;
      }
      setDeleteError(errorMessage(error, "La tâche n'a pas pu être supprimée."));
    }
  };

  return (
    <>
      <Overlay open={open} onRequestClose={requestClose} labelledBy={headingId} initialFocus={closeRef} variant="drawer">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 id={headingId} className="text-lg font-semibold text-ink">
            Détails de la tâche
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)} disabled={!task} aria-label="Supprimer la tâche" className="hover:bg-danger-soft hover:text-danger">
              <Trash2 className="size-5" aria-hidden />
            </Button>
            <Button ref={closeRef} variant="ghost" size="icon" onClick={requestClose} aria-label="Fermer le panneau">
              <X className="size-5" aria-hidden />
            </Button>
          </div>
        </header>

        {!task || !values ? (
          query.isError && !notFound ? (
            <ErrorState message={errorMessage(query.error, 'Impossible de charger la tâche.')} onRetry={() => void query.refetch()} />
          ) : (
            <div className="flex flex-col gap-4 p-6" role="status" aria-label="Chargement de la tâche">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )
        ) : (
          <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <TaskStatusBadge status={task.status} />
                <DueDateLabel task={task} showEmpty />
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-soft-ink">
                  <PencilLine className="size-3.5" aria-hidden />
                  Modification directe
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {formError && <InlineAlert>{formError}</InlineAlert>}
                <TaskFormFields values={values} errors={errors} onChange={onChange} disabled={update.isPending} />
              </div>
              <dl className="mt-6 grid gap-3 rounded-2xl border border-line bg-sunken p-4 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <CalendarClock className="size-4 shrink-0" aria-hidden />
                  <dt>Créée le</dt>
                  <dd className="ml-auto text-right font-medium text-ink">{formatInstant(task.createdAt)}</dd>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Clock3 className="size-4 shrink-0" aria-hidden />
                  <dt>Modifiée le</dt>
                  <dd className="ml-auto text-right font-medium text-ink">{formatInstant(task.updatedAt)}</dd>
                </div>
                {task.completedAt && (
                  <div className="flex items-center gap-2 text-muted">
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                    <dt>Terminée le</dt>
                    <dd className="ml-auto text-right font-medium text-ink">{formatInstant(task.completedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
            <footer className="safe-bottom flex flex-col-reverse gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              {dirty && <p className="text-sm text-muted sm:mr-auto">Modifications non enregistrées</p>}
              <Button variant="secondary" onClick={requestClose} disabled={update.isPending}>
                {dirty ? 'Annuler' : 'Fermer'}
              </Button>
              <Button type="submit" disabled={!dirty} loading={update.isPending} loadingText="Enregistrement…">
                Enregistrer les modifications
              </Button>
            </footer>
          </form>
        )}
      </Overlay>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer la tâche ?"
        icon={<Trash2 className="size-6" aria-hidden />}
        confirmLabel="Supprimer la tâche"
        destructive
        loading={remove.isPending}
        loadingText="Suppression…"
        error={deleteError ? <InlineAlert>{deleteError}</InlineAlert> : undefined}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
        onConfirm={doDelete}
      >
        Vous êtes sur le point de supprimer « <strong className="font-semibold break-words text-ink">{task?.title}</strong> ». Cette action est irréversible.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmDiscard}
        title="Abandonner les modifications ?"
        confirmLabel="Abandonner"
        cancelLabel="Continuer l'édition"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
      >
        Les changements apportés à cette tâche ne seront pas enregistrés.
      </ConfirmDialog>
    </>
  );
}
