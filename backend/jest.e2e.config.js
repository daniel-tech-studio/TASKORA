/** Tests E2E API : serveur NestJS complet, cookies, CSRF, base SQLite de test migrée. */
process.env.TASKORA_TEST_DB = process.env.TASKORA_TEST_DB || 'test-e2e.db';
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { diagnostics: { warnOnly: false } }] },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
  setupFiles: ['<rootDir>/test/setup/env.ts'],
  testTimeout: 30000,
};
