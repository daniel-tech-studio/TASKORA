import { defineConfig, devices } from '@playwright/test';

/**
 * Parcours navigateur de bout en bout contre la VRAIE API (NestJS + SQLite e2e dédiée).
 * Ports dédiés pour ne pas interférer avec l'environnement de développement.
 */
const API_PORT = 3200;
const WEB_PORT = 5273;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec/ },
  ],
  webServer: [
    {
      // Base e2e recréée et migrée (prisma migrate deploy) à chaque lancement.
      command:
        'npm --prefix ../backend run -s build && cd ../backend && rm -f prisma/data/e2e.db prisma/data/e2e.db-wal prisma/data/e2e.db-shm && npx prisma migrate deploy && node dist/main.js',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: 'file:./data/e2e.db',
        FRONTEND_ORIGIN: `http://localhost:${WEB_PORT}`,
        LOG_LEVEL: 'warn',
        THROTTLE_LOGIN_LIMIT: '1000',
        THROTTLE_REGISTER_LIMIT: '1000',
        THROTTLE_GLOBAL_LIMIT: '100000',
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}`, FRONTEND_PORT: String(WEB_PORT) },
    },
  ],
});
