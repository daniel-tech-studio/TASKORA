import { Client, createTestApp, TestApp, uniqueEmail } from '../helpers/app';

// Déploiement derrière un tunnel à URL variable : pas de liste d'origines fixe,
// seule l'origine identique à l'hôte transmis par le proxy de confiance est acceptée.
process.env.CSRF_ALLOW_SAME_HOST = 'true';
process.env.TRUST_PROXY = 'true';
process.env.FRONTEND_ORIGIN = '';

const HOST = 'calme-riviere-123.trycloudflare.com';

function proxied(app: TestApp['app'], origin: string | null): Client {
  const client = new Client(app);
  client.origin = origin;
  client.headers = { 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': HOST };
  return client;
}

describe('CSRF — origine identique à l’hôte (E2E)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('accepte une mutation dont l’origine est exactement l’hôte ciblé', async () => {
    const client = proxied(t.app, `https://${HOST}`);
    const res = await client.post('/auth/register', { name: 'Tunnel', email: uniqueEmail(), password: 'motdepasse1' });
    expect(res.status).toBe(201);
    expect((await client.post('/tasks', { title: 'Via le tunnel' })).status).toBe(201);
  });

  it.each([
    ['autre sous-domaine', 'https://autre-site-456.trycloudflare.com'],
    ['protocole différent', `http://${HOST}`],
    ['origine absente', null],
  ])('refuse : %s', async (_label, origin) => {
    const res = await proxied(t.app, origin).post('/auth/register', { name: 'X', email: uniqueEmail(), password: 'motdepasse1' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_INVALID');
  });

  it('le jeton CSRF reste obligatoire même pour une origine valide', async () => {
    const res = await proxied(t.app, `https://${HOST}`).post('/auth/register', { name: 'X', email: uniqueEmail(), password: 'motdepasse1' }, { csrf: null });
    expect(res.status).toBe(403);
  });
});
