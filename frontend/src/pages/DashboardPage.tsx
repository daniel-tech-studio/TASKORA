import { Link } from 'react-router-dom';
import { AlarmClock, ArrowRight, CheckCircle2, Circle, Flame, Layers, Loader, Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from '../components/ui/Feedback';
import { AllClearIllustration, EmptyTasksIllustration, WelcomeIllustration } from '../components/illustrations/Illustrations';
import { ProgressIndicator, StatCard, StatusDistributionChart, TaskMiniList } from '../components/dashboard/DashboardWidgets';
import { useHighPriorityTasks, useOverdueTasks, useTaskStats } from '../lib/queries';
import { useTaskUi } from '../lib/task-ui';
import { firstName, useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api/errors';
import type { TaskStats } from '../lib/types';

/** E03 — Tableau de bord : indicateurs calculés par le service (GET /tasks/stats), aucune valeur figée. */
export function DashboardPage() {
  const { user } = useAuth();
  const { openCreate, openTask } = useTaskUi();
  const stats = useTaskStats();
  const high = useHighPriorityTasks();
  const overdue = useOverdueTasks();
  const name = firstName(user);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={<>Bonjour, {name} 👋</>}
        action={
          <Button onClick={openCreate} icon={<Plus className="size-5" aria-hidden />}>
            Nouvelle tâche
          </Button>
        }
      />

      <section aria-label="Bienvenue" className="bg-brand-gradient relative mb-6 overflow-hidden rounded-[24px] p-6 text-white shadow-brand sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/15 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-[#A99CF4]/40 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-wide text-white/75 uppercase">Votre journée</p>
            <h2 className="mt-1.5 text-[22px] font-bold sm:text-[28px]">Gardez le cap sur vos priorités.</h2>
            <p className="mt-2 max-w-xl text-[15px] text-white/85">{heroMessage(stats.data)}</p>
            <Link
              to="/taches"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 focus-visible:outline-white"
            >
              Voir toutes mes tâches
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <WelcomeIllustration className="hidden w-56 shrink-0 md:block lg:w-64" />
        </div>
      </section>

      {stats.isPending ? (
        <DashboardSkeleton />
      ) : stats.isError ? (
        <div className="card">
          <ErrorState message={errorMessage(stats.error, 'Impossible de charger vos statistiques.')} onRetry={() => void stats.refetch()} />
        </div>
      ) : stats.data.total === 0 ? (
        <div className="card halo-bg">
          <EmptyState
            illustration={<EmptyTasksIllustration />}
            title="Pas encore de tâches"
            description="Une page blanche pour vos projets du jour. Ajoutez une première tâche pour voir votre progression prendre forme."
            action={
              <Button onClick={openCreate} icon={<Plus className="size-5" aria-hidden />}>
                Créer ma première tâche
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <section aria-label="Statistiques" className="stagger mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard index={0} label="Total" value={stats.data.total} icon={<Layers className="size-5" aria-hidden />} tone="bg-brand-soft text-brand-soft-ink" />
            <StatCard index={1} label="À faire" value={stats.data.todo} icon={<Circle className="size-5" aria-hidden />} tone="bg-info-soft text-info" />
            <StatCard index={2} label="En cours" value={stats.data.inProgress} icon={<Loader className="size-5" aria-hidden />} tone="bg-brand-soft text-brand" />
            <StatCard index={3} label="Terminées" value={stats.data.done} icon={<CheckCircle2 className="size-5" aria-hidden />} tone="bg-success-soft text-success" />
            <StatCard
              className="col-span-2 md:col-span-1"
              index={4}
              label="En retard"
              value={stats.data.overdue}
              icon={<AlarmClock className="size-5" aria-hidden />}
              tone={stats.data.overdue > 0 ? 'bg-danger-soft text-danger' : 'bg-neutral-soft text-muted'}
              context={stats.data.overdue === 0 ? 'Tout est à jour' : undefined}
            />
          </section>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <section aria-labelledby="progress-title" className="card p-5 sm:p-6">
              <h2 id="progress-title" className="mb-5 text-lg font-semibold text-ink sm:text-xl">
                Progression globale
              </h2>
              <ProgressIndicator stats={stats.data} />
            </section>
            <section aria-labelledby="distribution-title" className="card p-5 sm:p-6">
              <h2 id="distribution-title" className="mb-5 text-lg font-semibold text-ink sm:text-xl">
                Répartition des tâches
              </h2>
              <StatusDistributionChart stats={stats.data} />
            </section>
          </div>
        </>
      )}

      {stats.data && stats.data.total > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="high-title" className="card flex flex-col p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-danger-soft text-danger">
                <Flame className="size-[18px]" aria-hidden />
              </span>
              <h2 id="high-title" className="text-lg font-semibold text-ink">
                Tâches prioritaires
              </h2>
              {high.data && high.data.total > 0 && <span className="ml-auto text-sm font-semibold text-muted">{high.data.total}</span>}
            </div>
            {high.isPending ? (
              <ListSkeleton />
            ) : high.isError ? (
              <ErrorState compact message={errorMessage(high.error)} onRetry={() => void high.refetch()} />
            ) : high.data.items.length === 0 ? (
              <EmptyState compact title="Aucune priorité haute en attente" description="Vos tâches importantes sont sous contrôle." />
            ) : (
              <TaskMiniList tasks={high.data.items} onOpen={openTask} />
            )}
            <SeeAll />
          </section>

          <section aria-labelledby="overdue-title" className="card flex flex-col p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-warning-soft text-warning">
                <AlarmClock className="size-[18px]" aria-hidden />
              </span>
              <h2 id="overdue-title" className="text-lg font-semibold text-ink">
                En retard
              </h2>
              {overdue.data && overdue.data.total > 0 && <span className="ml-auto text-sm font-semibold text-danger">{overdue.data.total}</span>}
            </div>
            {overdue.isPending ? (
              <ListSkeleton />
            ) : overdue.isError ? (
              <ErrorState compact message={errorMessage(overdue.error)} onRetry={() => void overdue.refetch()} />
            ) : overdue.data.items.length === 0 ? (
              <EmptyState compact illustration={<AllClearIllustration />} title="Tout est à jour !" description="Aucune tâche en retard." />
            ) : (
              <TaskMiniList tasks={overdue.data.items} onOpen={openTask} />
            )}
            <SeeAll to="/taches?echeance=overdue" label="Voir les tâches en retard" />
          </section>
        </div>
      )}
    </>
  );
}

function heroMessage(stats?: TaskStats): string {
  if (!stats) return 'Chargement de votre journée…';
  if (stats.total === 0) return 'Commencez par noter ce qui vous occupe l’esprit : TASKORA s’occupe du reste.';
  const parts = [`${stats.inProgress} en cours`, `${stats.todo} à faire`];
  const tail = stats.overdue > 0 ? ` ${stats.overdue} tâche${stats.overdue > 1 ? 's' : ''} en retard à rattraper.` : ' Aucun retard : bravo !';
  return `Vous avez ${parts.join(' et ')}.${tail}`;
}

function SeeAll({ to = '/taches', label = 'Voir toutes mes tâches' }: { to?: string; label?: string }) {
  return (
    <Link to={to} className="mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-sm font-semibold text-brand underline-offset-4 hover:underline">
      {label}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <LoadingRegion label="Chargement du tableau de bord">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5">
            <Skeleton className="mb-3 size-10 rounded-xl" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="mt-2 h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card flex items-center gap-5 p-6">
            <Skeleton className="size-36 rounded-full" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
