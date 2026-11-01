import { onSessionExpired, request, resetCsrf } from './client';
import { ApiError } from './errors';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('client API', () => {
  let calls: { url: string; method: string; csrf: string | null }[];
  const install = (handler: Handler) => {
    calls = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({ url, method: init.method ?? 'GET', csrf: headers['X-CSRF-Token'] ?? null });
      expect(init.credentials).toBe('include');
      return handler(url, init);
    });
  };

  beforeEach(() => resetCsrf());
  afterEach(() => vi.unstubAllGlobals());

  it('obtient le jeton CSRF une seule fois et l’envoie sur les mutations uniquement', async () => {
    install((url) => (url.endsWith('/auth/csrf') ? json(200, { csrfToken: 'tok-1' }) : json(200, { ok: true })));
    await request('GET', '/tasks');
    await request('POST', '/tasks', { body: { title: 'a' } });
    await request('PATCH', '/tasks/1', { body: { title: 'b' } });
    expect(calls.map((c) => [c.method, c.url, c.csrf])).toEqual([
      ['GET', '/api/v1/tasks', null],
      ['GET', '/api/v1/auth/csrf', null],
      ['POST', '/api/v1/tasks', 'tok-1'],
      ['PATCH', '/api/v1/tasks/1', 'tok-1'],
    ]);
  });

  it('renouvelle le jeton et rejoue une fois après CSRF_INVALID', async () => {
    let n = 0;
    install((url) => {
      if (url.endsWith('/auth/csrf')) return json(200, { csrfToken: `tok-${++n}` });
      if (calls.filter((c) => c.method === 'POST').length === 1) return json(403, { code: 'CSRF_INVALID', message: 'x' });
      return json(201, { id: '1' });
    });
    await expect(request('POST', '/tasks', { body: {} })).resolves.toEqual({ id: '1' });
    expect(calls.filter((c) => c.method === 'POST').map((c) => c.csrf)).toEqual(['tok-1', 'tok-2']);
  });

  it('401 → un seul refresh partagé par les requêtes concurrentes, puis nouvelle tentative', async () => {
    let refreshed = false;
    install((url) => {
      if (url.endsWith('/auth/csrf')) return json(200, { csrfToken: 't' });
      if (url.endsWith('/auth/refresh')) {
        refreshed = true;
        return json(200, {});
      }
      return refreshed ? json(200, { ok: true }) : json(401, { code: 'UNAUTHORIZED', message: 'x' });
    });
    await Promise.all([request('GET', '/tasks'), request('GET', '/tasks/stats'), request('GET', '/auth/me')]);
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('refresh impossible → événement de session expirée et erreur UNAUTHORIZED', async () => {
    install((url) => (url.endsWith('/auth/csrf') ? json(200, { csrfToken: 't' }) : json(401, { code: 'UNAUTHORIZED', message: 'Session expirée' })));
    const listener = vi.fn();
    const off = onSessionExpired(listener);
    await expect(request('GET', '/tasks')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });

  it('erreurs normalisées et indisponibilité réseau', async () => {
    install(() => json(400, { code: 'VALIDATION_ERROR', message: 'Données invalides', details: { title: ['Le titre est obligatoire'] }, requestId: 'req_1' }));
    const error = await request('GET', '/tasks').catch((e) => e as ApiError);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldError('title')).toBe('Le titre est obligatoire');

    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    await expect(request('GET', '/tasks')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
