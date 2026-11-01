import { ConfigValidationError, loadConfig } from './app-config';

const valid = {
  NODE_ENV: 'development',
  DATABASE_URL: 'file:./data/dev.db',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  CSRF_SECRET: 'b'.repeat(40),
  FRONTEND_ORIGIN: 'http://localhost:5173',
};

describe('loadConfig', () => {
  it('accepte une configuration valide avec les valeurs par défaut documentées', () => {
    const config = loadConfig(valid);
    expect(config.accessTokenTtlSeconds).toBe(900);
    expect(config.refreshTokenTtlSeconds).toBe(604800);
    expect(config.throttle.login).toEqual({ limit: 5, ttlMs: 900_000 });
    expect(config.cookieSecure).toBe(false);
  });

  it.each([
    [{ JWT_ACCESS_SECRET: '' }, /JWT_ACCESS_SECRET/],
    [{ JWT_ACCESS_SECRET: 'REPLACE_ME' }, /JWT_ACCESS_SECRET/],
    [{ CSRF_SECRET: 'a'.repeat(40) }, /différents/],
    [{ DATABASE_URL: 'postgres://x' }, /SQLite/],
    [{ FRONTEND_ORIGIN: '*' }, /FRONTEND_ORIGIN/],
    [{ NODE_ENV: 'production', COOKIE_SECURE: 'false' }, /COOKIE_SECURE/],
    [{ PORT: 'abc' }, /PORT/],
  ])('refuse %o', (override, message) => {
    expect(() => loadConfig({ ...valid, ...override })).toThrow(ConfigValidationError);
    expect(() => loadConfig({ ...valid, ...override })).toThrow(message);
  });

  it('production : cookies sécurisés par défaut et Swagger désactivé', () => {
    const config = loadConfig({ ...valid, NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://taskora.example' });
    expect(config.cookieSecure).toBe(true);
    expect(config.swaggerEnabled).toBe(false);
  });
});
