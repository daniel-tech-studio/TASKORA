import { useId } from 'react';

export function LogoMark({ className = 'size-9' }: { className?: string }) {
  // Identifiant unique : un <defs> dans une instance masquée (display:none) ne se rend pas.
  const gradientId = `taskora-logo-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A7CF4" />
          <stop offset="1" stopColor="#5443D6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${gradientId})`} />
      <rect x="1" y="1" width="38" height="38" rx="11" fill="none" stroke="#fff" strokeOpacity=".22" />
      <path d="M12 20.8l5.2 5.2L28.5 14.5" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[19px] font-bold tracking-[0.08em] text-ink">TASKORA</span>
    </span>
  );
}
