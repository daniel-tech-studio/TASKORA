/** Tests unitaires et d'intégration (base SQLite de test réelle, migrée). */
process.env.TASKORA_TEST_DB = process.env.TASKORA_TEST_DB || 'test-unit.db';
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/integration/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { diagnostics: { warnOnly: false } }] },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
  setupFiles: ['<rootDir>/test/setup/env.ts'],
};
