import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

interface OverlayProps {
  open: boolean;
  onRequestClose(): void;
  labelledBy: string;
  describedBy?: string;
  /** Élément recevant le focus à l'ouverture (sinon le premier élément focalisable). */
  initialFocus?: RefObject<HTMLElement | null>;
  role?: 'dialog' | 'alertdialog';
  variant: 'modal' | 'drawer' | 'confirm';
  children: ReactNode;
}

/**
 * Socle des surfaces contextuelles (llm.md 4.5, 9) : rôle dialog, aria-modal, focus initial,
 * piège du focus, Échap, clic sur le voile, verrouillage du défilement et restitution du focus.
 */
export function Overlay({ open, onRequestClose, labelledBy, describedBy, initialFocus, role = 'dialog', variant, children }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openCount += 1;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const target = initialFocus?.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current;
      target?.focus();
    }, 10);

    const onKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      // Seule la surface la plus haute réagit (dialogue de confirmation au-dessus du drawer).
      const overlays = document.querySelectorAll('[data-overlay-panel]');
      if (overlays[overlays.length - 1] !== panel) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      openCount -= 1;
      if (openCount === 0) document.body.style.overflow = '';
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [open, initialFocus]);

  if (!open) return null;

  const layout = {
    modal: 'items-end sm:items-center justify-center sm:p-6',
    confirm: 'items-end sm:items-center justify-center p-4 sm:p-6',
    drawer: 'items-stretch justify-end',
  }[variant];
  const panelClass = {
    modal:
      'animate-sheet-in sm:animate-pop-in w-full sm:max-w-xl max-h-[94dvh] rounded-t-[24px] sm:rounded-[20px] bg-elevated border border-line shadow-soft-lg flex flex-col',
    confirm: 'animate-pop-in w-full max-w-md rounded-[20px] bg-elevated border border-line shadow-soft-lg',
    drawer:
      'animate-drawer-in w-full sm:max-w-[480px] h-full bg-elevated sm:border-l border-line shadow-soft-lg flex flex-col',
  }[variant];

  return createPortal(
    <div className={`fixed inset-0 z-[60] flex ${layout}`}>
      <div className="animate-fade-in absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]" aria-hidden onMouseDown={() => closeRef.current()} />
      <div
        ref={panelRef}
        data-overlay-panel=""
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative outline-none ${panelClass}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
