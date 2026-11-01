import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'soft';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-gradient text-white shadow-brand hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:brightness-95 dark:text-white',
  secondary: 'bg-surface text-ink border border-line-strong shadow-soft-sm hover:bg-sunken hover:border-brand/40',
  ghost: 'text-muted hover:bg-sunken hover:text-ink',
  soft: 'bg-brand-soft text-brand-soft-ink hover:brightness-[0.97] dark:hover:brightness-110',
  destructive: 'bg-danger text-white shadow-soft-sm hover:brightness-110 dark:text-[#2a0d13]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
  icon: 'size-11 rounded-xl',
};

/** Bouton : primary dégradé, secondary, ghost, soft, destructive ; chargement anti-doublon (llm.md 4.2). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, loadingText, icon, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition duration-200 ease-out select-none disabled:pointer-events-none disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});
