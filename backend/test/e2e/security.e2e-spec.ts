import { Client, createTestApp, registerClient, TestApp } from '../helpers/app';

describe('Sécurité plateforme (E2E)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  describe('T09 — CSRF et Origin', () => {
    it('jeton CSRF absent → 403 CSRF_INVALID, aucune mutation', async () => {
      const { client } = await registerClient(t.app);
      const res = await client.post('/tasks', { title: 'Sans CSRF' }, { csrf: null });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_INVALID');
      const list = await client.get('/tasks').expect(200);
      expect(list.body.pagination.total).toBe(0);
    });

    it('Origin interdit → 403, aucune mutation', async () => {
      const { client } = await registerClient(t.app);
      client.origin = 'https://evil.example';
      const res = await client.post('/tasks', { title: 'Depuis un site tiers' });
      expect(res.status).toBe(403);
      client.origin = null; // ni Origin ni Referer
      expect((await client.post('/tasks', { title: 'Sans origine' })).status).toBe(403);
      client.origin = 'http://localhost:5173';
      expect((await client.get('/tasks')).body.pagination.total).toBe(0);
    });

    it('jeton falsifié ou lié à une autre session → 403', async () => {
      const { client } = await registerClient(t.app);
      expect((await client.post('/tasks', { title: 'x' }, { csrf: 'A'.repeat(43) })).status).toBe(403);

      const { client: other } = await registerClient(t.app);
      const otherToken = other.csrf!;
      expect((await client.post('/tasks', { title: 'x' }, { csrf: otherToken })).status).toBe(403);
    });

    it('le jeton pré-authentification est invalidé par la connexion (liaison à la session)', async () => {
      const { credentials } = await registerClient(t.app);
      const client = new Client(t.app);
      const anonToken = await client.refreshCsrf();
      expect((await client.post('/auth/login', { email: credentials.email, password: credentials.password }, { csrf: anonToken })).status).toBe(200);
      expect((await client.post('/tasks', { title: 'x' }, { csrf: anonToken })).status).toBe(403);
      expect((await client.post('/tasks', { title: 'x' })).status).toBe(201); // jeton renouvelé
    });

    it('login et register sont aussi protégés', async () => {
      const client = new Client(t.app);
      expect((await client.post('/auth/login', { email: 'a@b.co', password: 'x' }, { csrf: null })).status).toBe(403);
      expect((await client.post('/auth/register', { name: 'a', email: 'a@b.co', password: 'motdepasse' }, { csrf: null })).status).toBe(403);
    });
  });

  it('CORS : origine autorisée avec credentials, jamais « * »', async () => {
    const client = new Client(t.app);
    const ok = await client.get('/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const ko = await client.get('/health').set('Origin', 'https://evil.example');
    expect(ko.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('en-têtes de sécurité et requestId', async () => {
    const res = await new Client(t.app).get('/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-request-id']).toMatch(/^req_/);
  });

  it('route inconnue → 404 NOT_FOUND normalisé', async () => {
    const res = await new Client(t.app).get('/nope').expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.requestId).toBeDefined();
  });

  it('JSON malformé → 400 VALIDATION_ERROR ; corps trop volumineux → 413', async () => {
    const { client } = await registerClient(t.app);
    const bad = await client.agentRaw('post', '/tasks').set('Content-Type', 'application/json').send('{"title":');
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('VALIDATION_ERROR');
    const big = await client.post('/tasks', { title: 'x', description: 'a'.repeat(200_000) });
    expect(big.status).toBe(413);
    expect(JSON.stringify(big.body)).not.toMatch(/at .*\.js|stack/i);
  });

  it('Swagger documente les routes réelles', async () => {
    const res = await new Client(t.app).agentRawGet('/api/docs-json').expect(200);
    const paths = Object.keys(res.body.paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout', '/api/v1/auth/me',
        '/api/v1/auth/csrf', '/api/v1/users/me', '/api/v1/users/me/password', '/api/v1/tasks', '/api/v1/tasks/stats', '/api/v1/tasks/{id}',
      ]),
    );
    expect(paths.some((p) => /reset|forgot|admin/i.test(p))).toBe(false);
  });
});
