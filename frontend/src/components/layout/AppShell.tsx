import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListTodo, LogOut, Plus, UserRound } from 'lucide-react';
import { Logo, LogoMark } from '../ui/Logo';
import { Button } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Avatar } from './Avatar';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { TaskUiProvider, useTaskUi } from '../../lib/task-ui';

const NAV = [
  { to: '/tableau-de-bord', label: 'Tableau de bord', short: 'Tableau de bord', Icon: LayoutDashboard },
  { to: '/taches', label: 'Mes tâches', short: 'Mes tâches', Icon: ListTodo },
  { to: '/profil', label: 'Mon profil', short: 'Profil', Icon: UserRound },
];

const TITLES: Record<string, string> = {
  '/tableau-de-bord': 'Tableau de bord',
  '/taches': 'Mes tâches',
  '/profil': 'Mon profil',
};

/** Coquille privée : sidebar + topbar (desktop/tablette), bottom nav (mobile) — llm.md 2.3–2.5. */
export function AppShell() {
  return (
    <TaskUiProvider>
      <ShellLayout />
    </TaskUiProvider>
  );
}

function ShellLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const title = TITLES[location.pathname] ?? 'TASKORA';

  useEffect(() => {
    document.title = `${title} · TASKORA`;
  }, [title]);

  return (
    <div className="min-h-dvh bg-app">
      <a href="#contenu" className="sr-only z-[80] rounded-xl bg-elevated px-4 py-3 font-semibold text-ink shadow-soft-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Aller au contenu
      </a>
      <SidebarNav />
      <div className="flex min-h-dvh flex-col sm:pl-20 lg:pl-64">
        <Topbar title={title} />
        <main id="contenu" ref={mainRef} tabIndex={-1} className="flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] outline-none sm:pb-10">
          <div key={location.pathname} className="animate-rise-in mx-auto w-full max-w-[1240px] px-4 pt-4 sm:px-6 sm:pt-6 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function NavItem({ to, label, Icon, compact }: { to: string; label: string; Icon: typeof LayoutDashboard; compact: 'rail' | 'full' }) {
  return (
    <NavLink
      to={to}
      title={compact === 'rail' ? label : undefined}
      aria-label={compact === 'rail' ? label : undefined}
      className={({ isActive }) =>
        `group relative flex h-12 items-center gap-3 rounded-xl text-[15px] font-semibold transition duration-200 ${compact === 'rail' ? 'justify-center' : 'px-3.5'} ${
          isActive ? 'bg-brand-soft text-brand-soft-ink' : 'text-muted hover:bg-sunken hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Marqueur de forme en plus de la couleur (llm.md 2.3). */}
          <span className={`absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-brand transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
          <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
          {compact === 'full' && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );
}

function SidebarNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-line bg-surface/80 backdrop-blur-xl sm:flex lg:w-64">
      <div className="flex h-[72px] items-center justify-center px-5 lg:justify-start">
        <span className="lg:hidden">
          <LogoMark />
          <span className="sr-only">TASKORA</span>
        </span>
        <span className="hidden lg:block">
          <Logo />
        </span>
      </div>
      <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1 px-3 pt-4 lg:px-4">
        {NAV.map((item) => (
          <div key={item.to}>
            <span className="lg:hidden">
              <NavItem to={item.to} label={item.label} Icon={item.Icon} compact="rail" />
            </span>
            <span className="hidden lg:block">
              <NavItem to={item.to} label={item.label} Icon={item.Icon} compact="full" />
            </span>
          </div>
        ))}
      </nav>
      <div className="m-4 hidden overflow-hidden rounded-2xl p-4 lg:block">
        <div className="halo-bg glass relative rounded-2xl p-4">
          <p className="font-display text-sm font-semibold text-ink">Un pas après l'autre</p>
          <p className="mt-1 text-xs text-muted">Terminer une petite tâche aujourd'hui, c'est déjà avancer.</p>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const { openCreate } = useTaskUi();
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();
  const showCreate = location.pathname !== '/profil';

  const doLogout = async () => {
    try {
      await logout();
      toast.info('Vous êtes déconnecté.');
    } catch {
      toast.info('Session fermée sur cet appareil.');
    }
    navigate('/connexion', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-app/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-2 px-4 sm:h-[72px] sm:px-6 lg:px-10">
        <span className="sm:hidden">
          <LogoMark className="size-8" />
        </span>
        <p className="min-w-0 flex-1 truncate pl-1 font-display text-base font-semibold text-ink sm:pl-0 sm:text-lg" aria-hidden>
          <span className="sm:hidden">{title}</span>
          <span className="hidden text-muted sm:inline">{greetingDate()}</span>
        </p>
        {/* Mobile : création toujours accessible depuis la topbar ; ailleurs via l'en-tête de page. */}
        {showCreate && (
          <Button onClick={openCreate} icon={<Plus className="size-5" aria-hidden />} className="h-11 px-3.5 sm:hidden">
            <span className="sr-only">Nouvelle tâche</span>
          </Button>
        )}
        <ThemeSwitcher />
        {user && (
          <Menu
            triggerLabel={`Compte de ${user.name}`}
            trigger={<Avatar name={user.name} size="sm" />}
            header={
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            }
            items={[
              { key: 'profile', label: 'Mon profil', icon: <UserRound className="size-[18px]" aria-hidden />, onSelect: () => navigate('/profil') },
              { key: 'logout', label: 'Se déconnecter', tone: 'danger', icon: <LogOut className="size-[18px]" aria-hidden />, onSelect: () => void doLogout() },
            ]}
          />
        )}
      </div>
    </header>
  );
}

function greetingDate(): string {
  const text = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function BottomNav() {
  return (
    <nav aria-label="Navigation principale" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-xl sm:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-3 gap-1 px-3 py-2">
        {NAV.map(({ to, short, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-xs leading-tight font-semibold transition ${isActive ? 'bg-brand-soft text-brand-soft-ink' : 'text-muted active:bg-sunken'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-[22px]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  <span>{short}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[24px] font-bold text-ink sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="hidden shrink-0 sm:block">{action}</div>}
    </div>
  );
}
