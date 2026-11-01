import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect(): void;
  checked?: boolean;
  tone?: 'default' | 'danger';
}

/**
 * Menu déroulant accessible : bouton aria-haspopup/expanded, rôle menu, flèches, Échap,
 * clic extérieur ; aligné à droite et contraint au viewport (llm.md 7 — popovers).
 */
export function Menu({ trigger, triggerLabel, items, header, radio = false }: { trigger: ReactNode; triggerLabel: string; items: MenuItem[]; header?: ReactNode; radio?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    const initial = Math.max(0, items.findIndex((i) => i.checked));
    window.setTimeout(() => itemRefs.current[initial]?.focus(), 0);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, items]);

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) buttonRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const index = itemRefs.current.findIndex((el) => el === document.activeElement);
    const move = (to: number) => {
      e.preventDefault();
      itemRefs.current[(to + items.length) % items.length]?.focus();
    };
    if (e.key === 'ArrowDown') move(index + 1);
    else if (e.key === 'ArrowUp') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(items.length - 1);
    else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl text-muted transition hover:bg-sunken hover:text-ink aria-expanded:bg-sunken aria-expanded:text-ink"
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={onKeyDown}
          className="animate-pop-in absolute top-[calc(100%+8px)] right-0 z-50 w-max max-w-[calc(100vw-2rem)] min-w-52 rounded-2xl border border-line bg-elevated p-1.5 shadow-soft-lg"
        >
          {header && <div className="border-b border-line px-3 pt-2 pb-3">{header}</div>}
          {items.map((item, index) => (
            <button
              key={item.key}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role={radio ? 'menuitemradio' : 'menuitem'}
              aria-checked={radio ? Boolean(item.checked) : undefined}
              tabIndex={-1}
              onClick={() => {
                item.onSelect();
                close(radio);
              }}
              className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition outline-none focus:bg-sunken ${
                item.tone === 'danger' ? 'text-danger hover:bg-danger-soft focus:bg-danger-soft' : 'text-ink hover:bg-sunken'
              } ${item.checked ? 'bg-brand-soft text-brand-soft-ink' : ''}`}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {radio && item.checked && <span className="size-2 rounded-full bg-brand" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
