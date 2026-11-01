import { Client, createTestApp, registerClient, TestApp } from '../helpers/app';

// Seuils proposés par backend.md E4, rétablis pour ce fichier (les autres suites les relèvent).
process.env.THROTTLE_LOGIN_LIMIT = '5';
process.env.THROTTLE_REGISTER_LIMIT = '3';

describe('T04 — limitation (E2E)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('connexions erronées répétées → 401 puis 429 RATE_LIMITED (IP + email)', async () => {
    const email = 'cible@exemple.test';
    const client = new Client(t.app);
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await client.post('/auth/login', { email, password: 'mauvais' })).status);
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    const limited = await client.post('/auth/login', { email: ' CIBLE@exemple.test', password: 'mauvais' });
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
    // Un autre email depuis la même IP n'est pas bloqué par ce compteur.
    expect((await client.post('/auth/login', { email: 'autre@exemple.test', password: 'mauvais' })).status).toBe(401);
  });

  it('inscriptions : 3 par heure et par IP', async () => {
    // registerClient a déjà été appelé 0 fois ici ; la 4e inscription est refusée.
    for (let i = 0; i < 3; i++) await registerClient(t.app);
    const res = await new Client(t.app).post('/auth/register', { name: 'x', email: 'quatrieme@exemple.test', password: 'motdepasse1' });
    expect(res.status).toBe(429);
  });
});
