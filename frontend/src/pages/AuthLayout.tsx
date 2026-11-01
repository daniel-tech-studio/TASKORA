import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { AuthIllustration } from '../components/illustrations/Illustrations';
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher';

/**
 * Mise en page d'authentification (llm.md E01/E02) : branding + illustration à gauche
 * (desktop), carte formulaire opaque à fort contraste ; décor atténué sur mobile.
 */
export function AuthLayout({ tagline, points, children }: { tagline: string; points: string[]; children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-app">
      <div className="halo-bg pointer-events-none absolute inset-0 opacity-70 lg:opacity-100" aria-hidden />
      <div className="animate-glow pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full bg-[var(--halo-1)] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-40 -bottom-48 size-[30rem] rounded-full bg-[var(--halo-2)] blur-3xl" aria-hidden />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1240px] lg:grid-cols-[1.1fr_1fr]">
        <section className="hidden flex-col justify-between p-10 lg:flex xl:p-14" aria-label="Présentation de TASKORA">
          <Logo />
          <div className="max-w-lg">
            <h2 className="text-[40px] leading-[1.12] font-bold text-ink xl:text-[46px]">
              Vos tâches, <span className="text-brand-gradient">en toute sérénité.</span>
            </h2>
            <p className="mt-4 text-lg text-muted">{tagline}</p>
            <ul className="mt-7 flex flex-col gap-3">
              {points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-[15px] font-medium text-ink">
                  <CheckCircle2 className="size-5 text-success" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass relative -mx-4 rounded-[28px] p-4">
            <AuthIllustration className="w-full" />
          </div>
        </section>

        <section className="flex flex-col px-4 py-6 sm:px-8 lg:justify-center lg:py-10">
          <div className="mb-8 flex items-center justify-between lg:absolute lg:top-8 lg:right-8 lg:mb-0">
            <Logo className="lg:hidden" />
            <span className="ml-auto">
              <ThemeSwitcher />
            </span>
          </div>
          <div className="mx-auto w-full max-w-[440px]">
            <div className="mb-6 flex justify-center lg:hidden" aria-hidden>
              <AuthIllustration className="w-56 opacity-90" />
            </div>
            <div className="animate-pop-in rounded-[24px] border border-line bg-surface p-6 shadow-soft-lg sm:p-8">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
