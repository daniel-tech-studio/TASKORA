import { Client, createTestApp, registerClient, TestApp, uniqueEmail } from '../helpers/app';

describe('Profil (E2E)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('GET/PATCH nom sans mot de passe actuel', async () => {
    const { client, user } = await registerClient(t.app);
    expect((await client.get('/users/me').expect(200)).body).toMatchObject({ id: user.id, name: 'Awa Dossou' });
    const res = await client.patch('/users/me', { name: '  Awa D.  ' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Awa D.');
    expect((await client.patch('/users/me', { name: '' })).status).toBe(400);
    expect((await client.patch('/users/me', {})).status).toBe(400);
    expect((await client.patch('/users/me', { passwordHash: 'x' })).status).toBe(400);
  });

  it('T20 — changement d’email sans / avec mauvais mot de passe : échec, données inchangées', async () => {
    const { client, credentials } = await registerClient(t.app);
    const newEmail = uniqueEmail('new');
    const none = await client.patch('/users/me', { email: newEmail });
    expect(none.status).toBe(400);
    expect(none.body.details.currentPassword).toBeDefined();
    const wrong = await client.patch('/users/me', { email: newEmail, currentPassword: 'faux-mot-de-passe' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.details.currentPassword).toBeDefined();
    expect((await client.get('/users/me')).body.email).toBe(credentials.email);

    const ok = await client.patch('/users/me', { email: newEmail.toUpperCase(), currentPassword: credentials.password });
    expect(ok.status).toBe(200);
    expect(ok.body.email).toBe(newEmail);
    // L'email inchangé ne nécessite pas de mot de passe.
    expect((await client.patch('/users/me', { email: newEmail, name: 'Même email' })).status).toBe(200);
  });

  it('changement d’email vers une adresse utilisée → 409', async () => {
    const { credentials: other } = await registerClient(t.app);
    const { client, credentials } = await registerClient(t.app);
    const res = await client.patch('/users/me', { email: other.email, currentPassword: credentials.password });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_ALREADY_USED');
  });

  it('T20 — changement de mot de passe sans / avec mauvais mot de passe actuel', async () => {
    const { client, credentials } = await registerClient(t.app);
    expect((await client.patch('/users/me/password', { newPassword: 'nouveau-mdp-123' })).status).toBe(400);
    expect((await client.patch('/users/me/password', { currentPassword: 'faux', newPassword: 'nouveau-mdp-123' })).status).toBe(400);
    expect((await client.patch('/users/me/password', { currentPassword: credentials.password, newPassword: 'court' })).status).toBe(400);
    const login = await new Client(t.app).post('/auth/login', { email: credentials.email, password: credentials.password });
    expect(login.status).toBe(200);
  });

  it('changement de mot de passe : session courante conservée, autres sessions révoquées', async () => {
    const { client, credentials } = await registerClient(t.app);
    const other = new Client(t.app);
    await other.post('/auth/login', { email: credentials.email, password: credentials.password });
    await other.get('/auth/me').expect(200);

    const res = await client.patch('/users/me/password', { currentPassword: credentials.password, newPassword: 'nouveau mot de passe' });
    expect(res.status).toBe(204);
    await client.get('/auth/me').expect(200);
    expect((await client.post('/auth/refresh')).status).toBe(200);
    await other.get('/auth/me').expect(401);
    expect((await other.post('/auth/refresh')).status).toBe(401);

    expect((await new Client(t.app).post('/auth/login', { email: credentials.email, password: credentials.password })).status).toBe(401);
    expect((await new Client(t.app).post('/auth/login', { email: credentials.email, password: 'nouveau mot de passe' })).status).toBe(200);
  });

  it('modification du fuseau via PATCH /users/me (sans nouvel écran)', async () => {
    const { client } = await registerClient(t.app);
    expect((await client.patch('/users/me', { timeZone: 'Europe/Paris' })).body.timeZone).toBe('Europe/Paris');
    const bad = await client.patch('/users/me', { timeZone: 'Pas/Un_Fuseau' });
    expect(bad.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(bad.status).toBe(400);
  });
});
