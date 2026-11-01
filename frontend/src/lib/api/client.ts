import { ApiError } from './errors';

/**
 * Adaptateur HTTP typé (llm.md 6.3, backend.md D1/E2) :
 * - cookies HttpOnly (credentials: 'include'), aucun jeton stocké côté JavaScript ;
 * - jeton CSRF obtenu via GET /auth/csrf, envoyé en X-CSRF-Token sur chaque mutation,
 *   renouvelé après changement de session et après un refus CSRF ;
 * - refresh « single-flight » sur 401, puis nouvelle tentative unique ;
 * - échec définitif → événement de session expirée.
 */

export const API_BASE = '/api/v1';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** Pas de tentative de refresh sur 401 (routes d'authentification). */
  skipRefresh?: boolean;
  signal?: AbortSignal;
}

type SessionListener = () => void;
const sessionExpiredListeners = new Set<SessionListener>();

export function onSessionExpired(listener: SessionListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function resetCsrf(): void {
  csrfToken = null;
  csrfPromise = null;
}

async function fetchCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  csrfPromise ??= raw('GET', '/auth/csrf')
    .then(async (res) => {
      const body = (await res.json()) as { csrfToken: string };
      csrfToken = body.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      csrfPromise = null;
    });
  return csrfPromise;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function raw(method: Method, path: string, options: RequestOptions = {}, csrf?: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  try {
    return await fetch(buildUrl(path, options.query), {
      method,
      headers,
      credentials: 'include',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Connexion au serveur impossible.');
  }
}

async function toError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { code?: ApiError['code']; message?: string; details?: Record<string, string[]>; requestId?: string };
    return new ApiError(res.status, body.code ?? 'INTERNAL_ERROR', body.message ?? 'Erreur inattendue', body.details ?? {}, body.requestId);
  } catch {
    return new ApiError(res.status, res.status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR', 'Réponse inattendue du serveur');
  }
}

/** Un seul refresh en vol à la fois, partagé par toutes les requêtes en échec (backend.md H7). */
export function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const token = await fetchCsrf();
      const res = await raw('POST', '/auth/refresh', {}, token);
      return res.ok;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function send(method: Method, path: string, options: RequestOptions, attempt: { csrfRetry: boolean; authRetry: boolean }): Promise<Response> {
  const mutating = method !== 'GET';
  const token = mutating ? await fetchCsrf() : undefined;
  const res = await raw(method, path, options, token);

  if (res.status === 403 && mutating && !attempt.csrfRetry) {
    const err = await toError(res.clone());
    if (err.code === 'CSRF_INVALID') {
      resetCsrf();
      return send(method, path, options, { ...attempt, csrfRetry: true });
    }
  }
  if (res.status === 401 && !options.skipRefresh && !attempt.authRetry) {
    await refreshSession();
    // Nouvelle tentative même si le refresh a échoué : un autre onglet a pu renouveler les cookies.
    const retry = await send(method, path, options, { ...attempt, authRetry: true });
    if (retry.status === 401) sessionExpiredListeners.forEach((l) => l());
    return retry;
  }
  return res;
}

export async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(method, path, options, { csrfRetry: false, authRetry: false });
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
