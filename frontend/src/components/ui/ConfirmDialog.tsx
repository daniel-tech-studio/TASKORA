import { useId, useRef, type ReactNode } from 'react';
import { Overlay } from './Overlay';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  loadingText?: string;
  error?: ReactNode;
  icon?: ReactNode;
  onConfirm(): void;
  onCancel(): void;
}

/**
 * Dialogue de confirmation : focus initial sur l'action NON destructive ; Entrée ne déclenche
 * que le bouton focalisé (aucune soumission implicite) ; bouton bloqué pendant l'action.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = 'Annuler', destructive, loading, loadingText, error, icon, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Overlay open={open} onRequestClose={() => !loading && onCancel()} labelledBy={titleId} describedBy={descId} initialFocus={cancelRef} role="alertdialog" variant="confirm">
      <div className="flex flex-col gap-4 p-6">
        {icon && <div className={`flex size-12 items-center justify-center rounded-2xl ${destructive ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand'}`}>{icon}</div>}
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <div id={descId} className="text-sm text-muted">
            {children}
          </div>
        </div>
        {error}
        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} loading={loading} loadingText={loadingText}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
