import { initials } from '../../lib/auth';

/** Avatar à initiales dans un disque (aucun upload photo, llm.md E05). */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'xl' }) {
  const cls = { sm: 'size-8 text-xs', md: 'size-9 text-sm', xl: 'size-20 text-2xl' }[size];
  return (
    <span className={`bg-brand-gradient relative inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white shadow-brand ${cls}`} aria-hidden>
      <span className="absolute inset-0 rounded-full ring-2 ring-white/25 ring-inset" />
      {initials(name)}
    </span>
  );
}
