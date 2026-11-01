import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onSessionExpired } from './api/client';
import { authApi } from './api/endpoints';
import { ApiError } from './api/errors';
import { browserTimeZone } from './dates';
import type { User } from './types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Vrai lorsque la dernière session s'est terminée par expiration (message sur l'écran Connexion). */
  sessionExpired: boolean;
  /** Vrai après une déconnexion volontaire : pas de « retour à la destination » à la reconnexion. */
  loggedOut: boolean;
  /** Erreur réseau lors de la vérification initiale de session. */
  bootError: ApiError | null;
  retryBoot(): void;
  login(email: string, password: string): Promise<User>;
  register(name: string, email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  setUser(user: User): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session persistante (cookies HttpOnly) vérifiée au chargement via GET /auth/me.
 * Inscription : la session est ouverte immédiatement par le service (backend.md D2).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const [bootError, setBootError] = useState<ApiError | null>(null);
  const userRef = useRef<User | null>(null);

  const setUser = useCallback((next: User | null) => {
    userRef.current = next;
    setUserState(next);
    setStatus(next ? 'authenticated' : 'anonymous');
  }, []);

  const boot = useCallback(async () => {
    setStatus('loading');
    setBootError(null);
    try {
      const me = await authApi.me();
      setUser(me.user);
    } catch (error) {
      if (error instanceof ApiError && error.isNetwork) {
        setBootError(error);
        setStatus('anonymous');
      } else {
        setUser(null);
      }
    }
  }, [setUser]);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(
    () =>
      onSessionExpired(() => {
        if (!userRef.current) return;
        // Aucune donnée privée ne doit rester affichée après expiration.
        queryClient.clear();
        setSessionExpired(true);
        setLoggedOut(false);
        setUser(null);
      }),
    [queryClient, setUser],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await authApi.login({ email, password });
      queryClient.clear();
      setSessionExpired(false);
      setLoggedOut(false);
      setUser(next);
      return next;
    },
    [queryClient, setUser],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const next = await authApi.register({ name, email, password, timeZone: browserTimeZone() });
      queryClient.clear();
      setSessionExpired(false);
      setLoggedOut(false);
      setUser(next);
      return next;
    },
    [queryClient, setUser],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      queryClient.clear();
      setSessionExpired(false);
      setLoggedOut(true);
      setUser(null);
    }
  }, [queryClient, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, sessionExpired, loggedOut, bootError, retryBoot: () => void boot(), login, register, logout, setUser }),
    [status, user, sessionExpired, loggedOut, bootError, boot, login, register, logout, setUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AuthProvider');
  return ctx;
}

export function firstName(user: User | null): string {
  if (!user) return '';
  return user.name.trim().split(/\s+/)[0] || user.name;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}
