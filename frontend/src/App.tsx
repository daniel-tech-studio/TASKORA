import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { AuthProvider, useAuth } from './lib/auth';
import { ApiError } from './lib/api/errors';
import { AppShell } from './components/layout/AppShell';
import { LogoMark } from './components/ui/Logo';
import { ErrorState } from './components/ui/Feedback';
import { safeDestination } from './lib/navigation';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { ProfilePage } from './pages/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      // Pas de nouvelle tentative silencieuse sur une erreur métier (4xx) ; une seule sur erreur réseau/5xx.
      retry: (count, error) => count < 1 && (!(error instanceof ApiError) || error.isNetwork || error.status >= 500),
    },
  },
});

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app" role="status" aria-label="Chargement de TASKORA">
      <LogoMark className="size-12 animate-pulse" />
    </div>
  );
}

/** Route privée : visiteur → Connexion (avec retour à la destination initiale). */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status, bootError, retryBoot, loggedOut } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (bootError)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-app px-4">
        <ErrorState message="Connexion au serveur impossible. Vérifiez votre réseau puis réessayez." onRetry={retryBoot} />
      </div>
    );
  if (status === 'anonymous') return <Navigate to="/connexion" replace state={loggedOut ? null : { from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** Écrans d'authentification : utilisateur connecté → tableau de bord. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (status === 'authenticated') return <Navigate to={safeDestination((location.state as { from?: string } | null)?.from)} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/connexion" element={<PublicOnly><LoginPage /></PublicOnly>} />
                <Route path="/inscription" element={<PublicOnly><RegisterPage /></PublicOnly>} />
                <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                  <Route path="/tableau-de-bord" element={<DashboardPage />} />
                  <Route path="/taches" element={<TasksPage />} />
                  <Route path="/profil" element={<ProfilePage />} />
                </Route>
                <Route path="/" element={<Navigate to="/tableau-de-bord" replace />} />
                <Route path="*" element={<Navigate to="/tableau-de-bord" replace />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
