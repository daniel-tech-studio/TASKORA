import type { ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from './Button';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** Région de chargement accessible : texte pour lecteurs d'écran, squelettes visuels. */
export function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  compact = false,
}: {
  illustration?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`animate-rise-in flex flex-col items-center text-center ${compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12'}`}>
      {illustration && <div className={compact ? 'w-28' : 'w-44 sm:w-52'}>{illustration}</div>}
      <h3 className={`font-display font-semibold text-ink ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, compact = false }: { message: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={`flex flex-col items-center text-center ${compact ? 'gap-2 py-6' : 'gap-3 py-12'}`}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <p className="max-w-sm text-sm font-medium text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" aria-hidden />} onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

export function InlineAlert({ tone = 'danger', children }: { tone?: 'danger' | 'info' | 'success'; children: ReactNode }) {
  const styles = {
    danger: 'border-danger/30 bg-danger-soft text-danger',
    info: 'border-info/30 bg-info-soft text-info',
    success: 'border-success/30 bg-success-soft text-success',
  }[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`animate-fade-in rounded-xl border px-3.5 py-3 text-sm font-medium ${styles}`}>
      {children}
    </div>
  );
}
