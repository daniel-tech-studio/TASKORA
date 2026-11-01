// Environnement de test : base SQLite isolée, secrets de test générés, seuils élevés
// (les tests de limitation abaissent explicitement leurs propres seuils).
import { randomBytes } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = `file:./data/${process.env.TASKORA_TEST_DB ?? 'test.db'}`;
process.env.JWT_ACCESS_SECRET ??= randomBytes(48).toString('base64url');
process.env.CSRF_SECRET ??= randomBytes(48).toString('base64url');
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';
process.env.CSRF_ALLOW_SAME_HOST = 'false';
process.env.TRUST_PROXY = 'false';
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL ?? 'silent';
process.env.SWAGGER_ENABLED = 'true';
process.env.THROTTLE_GLOBAL_LIMIT = '100000';
process.env.THROTTLE_LOGIN_LIMIT = '100000';
process.env.THROTTLE_REGISTER_LIMIT = '100000';
process.env.THROTTLE_REFRESH_LIMIT = '100000';
