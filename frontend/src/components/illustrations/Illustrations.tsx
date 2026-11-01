import { useId } from 'react';

/**
 * Illustrations vectorielles abstraites aux couleurs de la marque (llm.md 3.6 / 3.8).
 * Les couleurs passent par les variables CSS : variantes claires et sombres automatiques.
 * Décoratives : aria-hidden, le sens est toujours porté par le texte voisin.
 */

const V = {
  brand: 'var(--primary)',
  lavender: 'var(--lavender)',
  soft: 'var(--primary-soft)',
  surface: 'var(--bg-elevated)',
  sunken: 'var(--bg-sunken)',
  line: 'var(--border-strong)',
  ink: 'var(--text-primary)',
  muted: 'var(--text-tertiary)',
  success: 'var(--success)',
  successSoft: 'var(--success-soft)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

/** Identifiants SVG uniques par instance : un <defs> d'une copie masquée ne se rend pas. */
function useSvgIds<T extends string>(...names: T[]): Record<T, string> {
  const base = useId().replace(/:/g, '');
  return Object.fromEntries(names.map((n) => [n, `${n}-${base}`])) as Record<T, string>;
}

export function AuthIllustration({ className = '' }: { className?: string }) {
  const id = useSvgIds('glow', 'ring', 'shadow');
  return (
    <svg viewBox="0 0 420 360" className={className} aria-hidden fill="none">
      <defs>
        <radialGradient id={id.glow} cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor={V.lavender} stopOpacity=".55" />
          <stop offset="1" stopColor={V.lavender} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id.ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A7CF4" />
          <stop offset="1" stopColor="#5443D6" />
        </linearGradient>
        <filter id={id.shadow} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#1C2440" floodOpacity=".16" />
        </filter>
      </defs>
      <ellipse cx="210" cy="175" rx="190" ry="160" fill={`url(#${id.glow})`} />
      <circle cx="78" cy="70" r="7" fill={V.lavender} opacity=".7" />
      <circle cx="352" cy="96" r="4" fill={V.brand} opacity=".6" />
      <circle cx="366" cy="282" r="9" fill={V.lavender} opacity=".45" />
      <path d="M48 250c30-8 44 8 70 0" stroke={V.lavender} strokeWidth="3" strokeLinecap="round" opacity=".6" />

      {/* Carte principale : liste de tâches */}
      <g filter={`url(#${id.shadow})`}>
        <rect x="96" y="70" width="220" height="214" rx="24" fill={V.surface} />
        <rect x="96.5" y="70.5" width="219" height="213" rx="23.5" stroke={V.line} strokeOpacity=".6" />
      </g>
      <rect x="120" y="96" width="92" height="12" rx="6" fill={V.ink} opacity=".85" />
      <rect x="120" y="116" width="58" height="8" rx="4" fill={V.muted} opacity=".55" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(120 ${146 + i * 42})`}>
          <rect width="172" height="32" rx="12" fill={i === 1 ? V.soft : V.sunken} />
          <circle cx="18" cy="16" r="8" fill={i === 0 ? V.success : 'none'} stroke={i === 0 ? V.success : V.line} strokeWidth="2" />
          {i === 0 && <path d="M14.5 16.2l2.4 2.4 4.6-4.8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          <rect x="34" y="12" width={i === 2 ? 70 : 96} height="8" rx="4" fill={V.ink} opacity={i === 0 ? 0.35 : 0.7} />
          <rect x="140" y="10" width="22" height="12" rx="6" fill={i === 1 ? V.brand : V.lavender} opacity={i === 1 ? 0.9 : 0.5} />
        </g>
      ))}

      {/* Anneau de progression flottant */}
      <g className="animate-float-slow" filter={`url(#${id.shadow})`}>
        <rect x="262" y="34" width="118" height="92" rx="20" fill={V.surface} />
        <circle cx="300" cy="80" r="22" stroke={V.sunken} strokeWidth="8" />
        <circle cx="300" cy="80" r="22" stroke={`url(#${id.ring})`} strokeWidth="8" strokeLinecap="round" strokeDasharray="138" strokeDashoffset="44" transform="rotate(-90 300 80)" />
        <rect x="332" y="66" width="34" height="9" rx="4.5" fill={V.ink} opacity=".75" />
        <rect x="332" y="84" width="24" height="7" rx="3.5" fill={V.muted} opacity=".55" />
      </g>

      {/* Pastille d'échéance flottante */}
      <g className="animate-float-slow" style={{ animationDelay: '-3s' }} filter={`url(#${id.shadow})`}>
        <rect x="44" y="196" width="104" height="58" rx="18" fill={V.surface} />
        <rect x="60" y="212" width="26" height="26" rx="8" fill={V.soft} />
        <path d="M67 222h12M67 228h8" stroke={V.brand} strokeWidth="2.4" strokeLinecap="round" />
        <rect x="94" y="215" width="40" height="8" rx="4" fill={V.ink} opacity=".7" />
        <rect x="94" y="229" width="28" height="7" rx="3.5" fill={V.warning} opacity=".7" />
      </g>
      <path d="M332 214l6 12 13 2-9.5 9 2.3 13-11.8-6.3-11.8 6.3 2.3-13-9.5-9 13-2z" fill={V.lavender} opacity=".55" />
    </svg>
  );
}

export function EmptyTasksIllustration({ className = '' }: { className?: string }) {
  const id = useSvgIds('glow');
  return (
    <svg viewBox="0 0 240 190" className={className} aria-hidden fill="none">
      <defs>
        <radialGradient id={id.glow} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={V.lavender} stopOpacity=".45" />
          <stop offset="1" stopColor={V.lavender} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="100" rx="112" ry="86" fill={`url(#${id.glow})`} />
      <rect x="70" y="30" width="100" height="128" rx="16" fill={V.surface} stroke={V.line} strokeWidth="1.5" transform="rotate(-6 120 94)" />
      <rect x="66" y="26" width="100" height="128" rx="16" fill={V.surface} stroke={V.line} strokeWidth="1.5" transform="rotate(4 116 90)" />
      <g transform="rotate(4 116 90)">
        <rect x="84" y="50" width="52" height="8" rx="4" fill={V.ink} opacity=".7" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="84" y={72 + i * 16} width={i === 3 ? 40 : 64} height="6" rx="3" fill={V.line} opacity=".7" strokeDasharray="4 4" />
        ))}
      </g>
      <g transform="translate(150 112) rotate(38)">
        <rect width="14" height="58" rx="4" fill={V.brand} />
        <rect width="14" height="10" rx="3" fill={V.lavender} />
        <path d="M0 58l7 14 7-14z" fill={V.ink} opacity=".8" />
      </g>
      <path d="M44 56l3.5 7 7.5 1.2-5.5 5.3 1.3 7.5L44 73.5 37.2 77l1.3-7.5L33 64.2l7.5-1.2z" fill={V.lavender} />
      <circle cx="196" cy="48" r="5" fill={V.brand} opacity=".55" />
      <circle cx="40" cy="138" r="4" fill={V.brand} opacity=".4" />
    </svg>
  );
}

export function NoResultsIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden fill="none">
      <ellipse cx="100" cy="80" rx="86" ry="62" fill={V.soft} opacity=".55" />
      <rect x="40" y="38" width="96" height="22" rx="10" fill={V.surface} stroke={V.line} />
      <rect x="40" y="68" width="96" height="22" rx="10" fill={V.surface} stroke={V.line} opacity=".7" />
      <rect x="40" y="98" width="70" height="22" rx="10" fill={V.surface} stroke={V.line} opacity=".45" />
      <circle cx="132" cy="84" r="24" fill={V.surface} stroke={V.brand} strokeWidth="6" />
      <path d="M149 101l17 17" stroke={V.brand} strokeWidth="8" strokeLinecap="round" />
      <path d="M124 78l16 12M140 78l-16 12" stroke={V.lavender} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function AllClearIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden fill="none">
      <circle cx="80" cy="60" r="50" fill={V.successSoft} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={80 + Math.cos(a) * 38} y1={60 + Math.sin(a) * 38} x2={80 + Math.cos(a) * 46} y2={60 + Math.sin(a) * 46} stroke={V.success} strokeWidth="3" strokeLinecap="round" opacity=".55" />;
      })}
      <circle cx="80" cy="60" r="26" fill={V.success} />
      <path d="M69 60.5l7.5 7.5L92 52.5" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WelcomeIllustration({ className = '' }: { className?: string }) {
  const id = useSvgIds('a');
  return (
    <svg viewBox="0 0 260 180" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id={id.a} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <circle cx="150" cy="92" r="70" fill="#fff" opacity=".12" />
      <circle cx="150" cy="92" r="48" fill="#fff" opacity=".14" />
      <g className="animate-float-slow">
        <circle cx="150" cy="92" r="30" fill={`url(#${id.a})`} />
        <path d="M150 70l9 22-9 22-9-22z" fill="#6757E8" />
        <path d="M150 70l9 22h-18z" fill="#A99CF4" />
        <circle cx="150" cy="92" r="4" fill="#fff" />
      </g>
      <g opacity=".9">
        <rect x="24" y="38" width="64" height="24" rx="12" fill="#fff" opacity=".22" />
        <circle cx="38" cy="50" r="5" fill="#fff" />
        <rect x="48" y="47" width="30" height="6" rx="3" fill="#fff" opacity=".8" />
      </g>
      <g opacity=".9">
        <rect x="196" y="128" width="54" height="22" rx="11" fill="#fff" opacity=".22" />
        <circle cx="209" cy="139" r="4.5" fill="#fff" />
        <rect x="218" y="136" width="24" height="6" rx="3" fill="#fff" opacity=".8" />
      </g>
      <path d="M214 34l3.5 7 7.5 1.2-5.5 5.3 1.3 7.5-6.8-3.5-6.8 3.5 1.3-7.5-5.5-5.3 7.5-1.2z" fill="#fff" opacity=".7" />
    </svg>
  );
}
