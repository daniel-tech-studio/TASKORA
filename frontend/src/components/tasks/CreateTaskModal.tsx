import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Overlay } from '../ui/Overlay';
import { Button } from '../ui/Button';
import { InlineAlert } from '../ui/Feedback';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TaskFormFields } from './TaskFormFields';
import { EMPTY_TASK, isDirty, serverFieldErrors, toInput, validateTask, type TaskFormErrors, type TaskFormValues } from './task-form';
import { useCreateTask } from '../../lib/queries';
import { useToast } from '../../lib/toast';
import { ApiError, errorMessage } from '../../lib/api/errors';

/** M01 — Nouvelle tâche : formulaire complet, validation avant envoi, échec sans fermeture trompeuse. */
export function CreateTaskModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<TaskFormValues>(EMPTY_TASK);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const create = useCreateTask();
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setValues(EMPTY_TASK);
      setErrors({});
      setFormError(null);
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const requestClose = () => {
    if (create.isPending) return;
    if (isDirty(values, EMPTY_TASK)) setConfirmDiscard(true);
    else onClose();
  };

  const onChange = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending) return;
    const found = validateTask(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      titleRef.current?.focus();
      return;
    }
    try {
      await create.mutateAsync(toInput(values));
      toast.success('Tâche créée');
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') setErrors(serverFieldErrors(error.details));
      setFormError(errorMessage(error, "La tâche n'a pas pu être créée."));
    }
  };

  return (
    <>
      <Overlay open={open} onRequestClose={requestClose} labelledBy={titleId} initialFocus={titleRef} variant="modal">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-white shadow-brand">
                <Plus className="size-5" aria-hidden />
              </span>
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-ink sm:text-xl">
                  Nouvelle tâche
                </h2>
                <p className="text-sm text-muted">Renseignez l'essentiel, vous pourrez compléter plus tard.</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={requestClose} aria-label="Fermer" className="-mt-1 -mr-2">
              <X className="size-5" aria-hidden />
            </Button>
          </header>
          <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4">
              {formError && <InlineAlert>{formError}</InlineAlert>}
              <TaskFormFields values={values} errors={errors} onChange={onChange} titleRef={titleRef} disabled={create.isPending} />
            </div>
          </div>
          <footer className="safe-bottom flex flex-col-reverse gap-3 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button variant="secondary" onClick={requestClose} disabled={create.isPending}>
              Annuler
            </Button>
            <Button type="submit" loading={create.isPending} loadingText="Création…">
              Créer la tâche
            </Button>
          </footer>
        </form>
      </Overlay>
      <ConfirmDialog
        open={confirmDiscard}
        title="Abandonner cette tâche ?"
        confirmLabel="Abandonner"
        cancelLabel="Continuer la saisie"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
      >
        Les informations saisies ne seront pas enregistrées.
      </ConfirmDialog>
    </>
  );
}
