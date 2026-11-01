import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/setup-app';
import { Clock } from '../../src/common/time/clock';
import { PrismaService } from '../../src/prisma/prisma.service';

export const ORIGIN = 'http://localhost:5173';

/** Horloge contrôlable pour les tests d'échéance, de fuseau et d'expiration. */
export class FakeClock extends Clock {
  private current: Date | null = null;
  override now(): Date {
    return this.current ? new Date(this.current) : new Date();
  }
  set(iso: string | Date): void {
    this.current = new Date(iso);
  }
  advance(ms: number): void {
    this.current = new Date(this.now().getTime() + ms);
  }
  reset(): void {
    this.current = null;
  }
}

export interface TestApp {
  app: NestExpressApplication;
  clock: FakeClock;
  prisma: PrismaService;
  close(): Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const clock = new FakeClock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  setupApp(app);
  await app.init();
  return { app, clock, prisma: app.get(PrismaService), close: () => app.close() };
}

/**
 * Client navigateur simulé : jarre de cookies explicite (inspectable et clonable),
 * en-tête Origin, jeton CSRF obtenu via GET /auth/csrf et renouvelé après chaque
 * changement de session (login/register/logout).
 */
export class Client {
  readonly cookies = new Map<string, string>();
  csrf: string | null = null;
  origin: string | null = ORIGIN;

  constructor(private readonly app: NestExpressApplication) {}

  private absorb(res: request.Response): void {
    const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
    for (const line of raw ?? []) {
      const [pair, ...attrs] = line.split(';').map((p) => p.trim());
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const value = decodeURIComponent(pair.slice(eq + 1));
      const expired = attrs.some((a) => /^max-age=0$/i.test(a) || (/^expires=/i.test(a) && new Date(a.slice(8)) < new Date()));
      if (expired || value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  private cookieHeader(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  }

  async refreshCsrf(): Promise<string> {
    const res = await this.get('/auth/csrf').expect(200);
    this.csrf = res.body.csrfToken as string;
    return this.csrf;
  }

  get(path: string): request.Test {
    const req = request(this.app.getHttpServer()).get(`/api/v1${path}`).set('Cookie', this.cookieHeader());
    return req.on('response', (res: request.Response) => this.absorb(res)) as request.Test;
  }

  async send(method: 'post' | 'patch' | 'delete', path: string, body?: object, opts: { csrf?: string | null } = {}) {
    const token = opts.csrf !== undefined ? opts.csrf : (this.csrf ?? (await this.refreshCsrf()));
    let req = request(this.app.getHttpServer())[method](`/api/v1${path}`).set('Cookie', this.cookieHeader());
    if (this.origin) req = req.set('Origin', this.origin);
    if (token) req = req.set('X-CSRF-Token', token);
    const res = await (body !== undefined ? req.send(body) : req);
    this.absorb(res);
    if (/^\/auth\/(login|register|logout)/.test(path)) await this.refreshCsrf();
    return res;
  }

  post(path: string, body?: object, opts?: { csrf?: string | null }) {
    return this.send('post', path, body, opts);
  }
  patch(path: string, body?: object, opts?: { csrf?: string | null }) {
    return this.send('patch', path, body, opts);
  }
  delete(path: string, opts?: { csrf?: string | null }) {
    return this.send('delete', path, undefined, opts);
  }

  /** Requête brute (corps arbitraire) avec cookies, Origin et CSRF courants. */
  agentRaw(method: 'post' | 'patch', path: string): request.Test {
    let req = request(this.app.getHttpServer())[method](`/api/v1${path}`).set('Cookie', this.cookieHeader());
    if (this.origin) req = req.set('Origin', this.origin);
    if (this.csrf) req = req.set('X-CSRF-Token', this.csrf);
    return req;
  }

  agentRawGet(fullPath: string): request.Test {
    return request(this.app.getHttpServer()).get(fullPath);
  }

  /** Copie de l'état navigateur (simule un vol de cookies ou un second onglet). */
  clone(): Client {
    const copy = new Client(this.app);
    for (const [k, v] of this.cookies) copy.cookies.set(k, v);
    copy.csrf = this.csrf;
    return copy;
  }
}

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@exemple.test`;
}

export async function registerClient(app: NestExpressApplication, overrides: Partial<{ name: string; email: string; password: string; timeZone: string }> = {}) {
  const client = new Client(app);
  const credentials = { name: 'Awa Dossou', email: uniqueEmail(), password: 'motdepasse-sûr', ...overrides };
  const res = await client.post('/auth/register', credentials);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { client, credentials, user: res.body as { id: string; email: string; name: string; timeZone: string } };
}
