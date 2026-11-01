import { sign } from 'jsonwebtoken';
import { Client, createTestApp, registerClient, TestApp, uniqueEmail } from '../helpers/app';

describe('Auth (E2E)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.clock.reset());
  afterAll(() => t.close());

  it('T01 — inscription puis /auth/me : session valide, profil sans hash', async () => {
    const { client, user } = await registerClient(t.app, { email: '  Mixed.Case@Exemple.TEST ', timeZone: 'Africa/Porto-Novo' });
    expect(user.email).toBe('mixed.case@exemple.test');
    expect(user.timeZone).toBe('Africa/Porto-Novo');
    expect(JSON.stringify(user)).not.toMatch(/password|hash/i);
    expect(client.cookies.has('taskora_access')).toBe(true);
    expect(client.cookies.has('taskora_refresh')).toBe(true);

    const me = await client.get('/auth/me').expect(200);
    expect(me.body.user).toMatchObject({ id: user.id, name: 'Awa Dossou', email: 'mixed.case@exemple.test' });
    expect(me.body.session.id).toEqual(expect.any(String));
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|refreshTokenHash/);
  });

  it('pose des cookies HttpOnly SameSite=Lax, jamais de jeton dans le corps', async () => {
    const client = new Client(t.app);
    await client.refreshCsrf();
    const res = await client.post('/auth/register', { name: 'Kofi', email: uniqueEmail(), password: 'motdepasse1' });
    expect(res.status).toBe(201);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    for (const name of ['taskora_access', 'taskora_refresh']) {
      const line = cookies.find((c) => c.startsWith(`${name}=`))!;
      expect(line).toMatch(/HttpOnly/);
      expect(line).toMatch(/SameSite=Lax/);
      expect(line).toMatch(/Path=\//);
    }
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ|token/i);
  });

  it('fuseau absent → UTC ; fuseau invalide → 400', async () => {
    const { user } = await registerClient(t.app);
    expect(user.timeZone).toBe('UTC');
    const client = new Client(t.app);
    const res = await client.post('/auth/register', { name: 'X', email: uniqueEmail(), password: 'motdepasse1', timeZone: 'Mars/Olympus' });
    expect(res.status).toBe(400);
    expect(res.body.details.timeZone).toBeDefined();
  });

  it('T02 — même email deux fois → 409 EMAIL_ALREADY_USED, unicité préservée', async () => {
    const email = uniqueEmail();
    await registerClient(t.app, { email });
    const res = await new Client(t.app).post('/auth/register', { name: 'Autre', email: email.toUpperCase(), password: 'motdepasse1' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_ALREADY_USED');
    expect(JSON.stringify(res.body)).not.toMatch(/Awa/);
    expect(await t.prisma.user.count({ where: { email } })).toBe(1);
  });

  it('T03 — mot de passe de 7 caractères → 400 ; espaces et mots de passe longs acceptés', async () => {
    const res = await new Client(t.app).post('/auth/register', { name: 'A', email: uniqueEmail(), password: '1234567' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.password[0]).toMatch(/8 caractères/);

    const { client, credentials } = await registerClient(t.app, { password: '  une phrase de passe avec espaces '.repeat(3) });
    await client.post('/auth/logout');
    const login = await client.post('/auth/login', { email: credentials.email, password: credentials.password });
    expect(login.status).toBe(200);
  });

  it('connexion invalide → 401 message générique identique (email inconnu ou mauvais mot de passe)', async () => {
    const { credentials } = await registerClient(t.app);
    const wrongPass = await new Client(t.app).post('/auth/login', { email: credentials.email, password: 'mauvais-mdp' });
    const unknown = await new Client(t.app).post('/auth/login', { email: uniqueEmail(), password: 'mauvais-mdp' });
    expect(wrongPass.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPass.body.message).toBe('Adresse e-mail ou mot de passe incorrect.');
    expect(unknown.body.message).toBe(wrongPass.body.message);
    expect(wrongPass.body.code).toBe('UNAUTHORIZED');
  });

  it('T05 — access expiré + refresh valide → nouveaux cookies, ancien refresh consommé', async () => {
    const { client, user } = await registerClient(t.app);
    const oldRefresh = client.cookies.get('taskora_refresh')!;
    const sid = oldRefresh.split('.')[0];

    // Access JWT expiré (signature valide) → 401.
    const expired = sign({ sid }, process.env.JWT_ACCESS_SECRET!, {
      subject: user.id, issuer: 'taskora', audience: 'taskora-web', expiresIn: -10, jwtid: 'x',
    });
    client.cookies.set('taskora_access', expired);
    await client.get('/auth/me').expect(401);

    const res = await client.post('/auth/refresh');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id });
    const newRefresh = client.cookies.get('taskora_refresh')!;
    expect(newRefresh).not.toBe(oldRefresh);
    expect(newRefresh.split('.')[0]).toBe(sid); // même session, nouveau secret
    await client.get('/auth/me').expect(200);

    const history = await t.prisma.refreshTokenHistory.findMany({ where: { sessionId: sid } });
    expect(history).toHaveLength(1);
    expect(history[0].tokenHash).not.toContain(oldRefresh); // empreinte, jamais le jeton brut
    const session = await t.prisma.session.findUniqueOrThrow({ where: { id: sid } });
    expect(session.refreshTokenHash).not.toBe(newRefresh);
  });

  it('JWT falsifié (alg=none ou mauvaise signature) → 401', async () => {
    const { client, user } = await registerClient(t.app);
    const sid = client.cookies.get('taskora_refresh')!.split('.')[0];
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: user.id, sid, jti: 'x', iss: 'taskora', aud: 'taskora-web', exp: 9999999999 })).toString('base64url');
    client.cookies.set('taskora_access', `${header}.${payload}.`);
    await client.get('/auth/me').expect(401);
    client.cookies.set('taskora_access', sign({ sid }, 'un-autre-secret-de-plus-de-32-caracteres!', { subject: user.id, issuer: 'taskora', audience: 'taskora-web', expiresIn: 600, jwtid: 'y' }));
    await client.get('/auth/me').expect(401);
  });

  it('T06 — réutilisation d’un ancien refresh après rotation → 401 et révocation de la famille', async () => {
    const { client } = await registerClient(t.app);
    const thief = client.clone();
    const sid = client.cookies.get('taskora_refresh')!.split('.')[0];

    await client.post('/auth/refresh').then((r) => expect(r.status).toBe(200));
    t.clock.advance(60_000); // au-delà de la fenêtre de concurrence légitime

    const reuse = await thief.post('/auth/refresh');
    expect(reuse.status).toBe(401);
    const session = await t.prisma.session.findUniqueOrThrow({ where: { id: sid } });
    expect(session.revokedAt).not.toBeNull();

    // Le titulaire légitime est aussi déconnecté (famille révoquée).
    t.clock.reset();
    await client.get('/auth/me').expect(401);
    expect((await client.post('/auth/refresh')).status).toBe(401);
  });

  it('refresh concurrents rapprochés : pas de faux signalement de vol', async () => {
    const { client } = await registerClient(t.app);
    const tab2 = client.clone();
    const sid = client.cookies.get('taskora_refresh')!.split('.')[0];
    expect((await client.post('/auth/refresh')).status).toBe(200);
    const late = await tab2.post('/auth/refresh'); // même ancien jeton, dans la fenêtre de grâce
    expect(late.status).toBe(401);
    expect(late.headers['set-cookie']).toBeUndefined(); // ne détruit pas les cookies renouvelés
    const session = await t.prisma.session.findUniqueOrThrow({ where: { id: sid } });
    expect(session.revokedAt).toBeNull();
    await client.get('/auth/me').expect(200);
  });

  it('refresh expiré (7 jours) → 401 et cookies effacés', async () => {
    const { client } = await registerClient(t.app);
    t.clock.advance(7 * 24 * 3600 * 1000 + 1000);
    const res = await client.post('/auth/refresh');
    expect(res.status).toBe(401);
    expect(client.cookies.has('taskora_refresh')).toBe(false);
  });

  it('T07 — déconnexion : session révoquée, cookies effacés, refresh refusé', async () => {
    const { client } = await registerClient(t.app);
    const stolen = client.clone();
    const sid = client.cookies.get('taskora_refresh')!.split('.')[0];
    const res = await client.post('/auth/logout');
    expect(res.status).toBe(204);
    expect(client.cookies.has('taskora_access')).toBe(false);
    expect(client.cookies.has('taskora_refresh')).toBe(false);
    expect((await t.prisma.session.findUniqueOrThrow({ where: { id: sid } })).revokedAt).not.toBeNull();
    await stolen.get('/auth/me').expect(401);
    expect((await stolen.post('/auth/refresh')).status).toBe(401);
  });

  it('T08 — deux appareils : la déconnexion de A ne coupe pas B', async () => {
    const { credentials } = await registerClient(t.app);
    const a = new Client(t.app);
    const b = new Client(t.app);
    expect((await a.post('/auth/login', { email: credentials.email, password: credentials.password })).status).toBe(200);
    expect((await b.post('/auth/login', { email: credentials.email, password: credentials.password })).status).toBe(200);
    expect((await a.post('/auth/logout')).status).toBe(204);
    await a.get('/auth/me').expect(401);
    await b.get('/auth/me').expect(200);
    expect((await b.post('/auth/refresh')).status).toBe(200);
  });

  it('routes protégées sans cookie → 401 UNAUTHORIZED normalisé', async () => {
    const res = await new Client(t.app).get('/tasks').expect(401);
    expect(res.body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String), requestId: expect.stringMatching(/^req_/) });
  });
});
