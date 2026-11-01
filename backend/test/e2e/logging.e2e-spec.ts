import { AppLogger } from '../../src/common/logging/app-logger';
import { Client, createTestApp, registerClient, TestApp } from '../helpers/app';

process.env.LOG_LEVEL = 'debug';

describe('T24 — journaux sans secrets (E2E)', () => {
  const lines: string[] = [];
  let t: TestApp;
  beforeAll(async () => {
    AppLogger.setSink((line) => lines.push(line));
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('aucun mot de passe, jeton, cookie ou jeton CSRF dans les journaux', async () => {
    const password = 'Secret-Unique-Pwd-42';
    const { client, credentials } = await registerClient(t.app, { password });
    const old = client.clone();
    await client.post('/auth/refresh');
    t.clock.advance(60_000);
    await old.post('/auth/refresh'); // réutilisation → événement journalisé
    t.clock.reset();
    const other = new Client(t.app);
    await other.post('/auth/login', { email: credentials.email, password: 'wrong-' + password });
    await other.post('/auth/login', { email: credentials.email, password });
    await other.patch('/users/me/password', { currentPassword: password, newPassword: 'Nouveau-Secret-99' });
    await other.post('/tasks', { title: 'x' }, { csrf: 'forged-token' });
    await other.post('/auth/logout');

    const log = lines.join('\n');
    expect(lines.length).toBeGreaterThan(5);
    const secrets = [password, 'Nouveau-Secret-99', ...old.cookies.values(), ...client.cookies.values(), ...other.cookies.values(), client.csrf!, other.csrf!].filter(Boolean);
    for (const secret of secrets) expect(log).not.toContain(secret);
    expect(log).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/); // aucun JWT
    expect(log).toContain('refresh_reuse_detected');
    expect(log).toContain('csrf_rejected');
    expect(log).toContain('"requestId":"req_');
  });
});
