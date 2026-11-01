import { useRef, type KeyboardEvent, type ReactNode } from 'react';

interface Tab<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** Onglets accessibles (rôles tablist/tab, flèches gauche/droite, Début/Fin). */
export function Tabs<T extends string>({ tabs, value, onChange, label, idPrefix }: { tabs: Tab<T>[]; value: T; onChange(v: T): void; label: string; idPrefix: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-2xl border border-line bg-sunken p-1">
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            type="button"
            id={`${idPrefix}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 ${
              selected ? 'bg-surface text-ink shadow-soft-md ring-1 ring-line' : 'text-muted hover:text-ink'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
