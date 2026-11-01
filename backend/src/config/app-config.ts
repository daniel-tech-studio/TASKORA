import { Injectable } from '@nestjs/common';

export interface ThrottleRule {
  limit: number;
  ttlMs: number;
}

export interface AppConfigValues {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  jwtAccessSecret: string;
  csrfSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  refreshReuseGraceSeconds: number;
  frontendOrigins: string[];
  cookieSecure: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  swaggerEnabled: boolean;
  trustProxy: boolean;
  throttle: {
    global: ThrottleRule;
    login: ThrottleRule;
    register: ThrottleRule;
    refresh: ThrottleRule;
  };
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;
const NODE_ENVS = ['development', 'test', 'production'] as const;
const FORBIDDEN_SECRETS = new Set(['REPLACE_ME', 'changeme', 'secret']);

export class ConfigValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Configuration invalide :\n - ${problems.join('\n - ')}`);
  }
}

/**
 * Valide les variables d'environnement au démarrage (backend.md F2 / E1).
 * Toute anomalie interrompt le démarrage : aucune valeur par défaut n'est
 * substituée à un secret manquant.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfigValues {
  const problems: string[] = [];

  const str = (key: string, fallback?: string): string => {
    const value = env[key]?.trim();
    if (value) return value;
    if (fallback !== undefined) return fallback;
    problems.push(`${key} est obligatoire`);
    return '';
  };
  const int = (key: string, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER): number => {
    const raw = env[key]?.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      problems.push(`${key} doit être un entier entre ${min} et ${max}`);
      return fallback;
    }
    return value;
  };
  const bool = (key: string, fallback: boolean): boolean => {
    const raw = env[key]?.trim().toLowerCase();
    if (!raw) return fallback;
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    problems.push(`${key} doit valoir true ou false`);
    return fallback;
  };
  const secret = (key: string): string => {
    const value = str(key);
    if (value && (value.length < 32 || FORBIDDEN_SECRETS.has(value))) {
      problems.push(`${key} doit être un secret aléatoire d'au moins 32 caractères`);
    }
    return value;
  };

  const nodeEnv = str('NODE_ENV', 'development') as AppConfigValues['nodeEnv'];
  if (!NODE_ENVS.includes(nodeEnv)) problems.push(`NODE_ENV doit être l'une des valeurs ${NODE_ENVS.join(', ')}`);

  const logLevel = str('LOG_LEVEL', 'info') as AppConfigValues['logLevel'];
  if (!LOG_LEVELS.includes(logLevel)) problems.push(`LOG_LEVEL doit être l'une des valeurs ${LOG_LEVELS.join(', ')}`);

  const databaseUrl = str('DATABASE_URL');
  if (databaseUrl && !databaseUrl.startsWith('file:')) problems.push('DATABASE_URL doit désigner un fichier SQLite (file:...)');

  const frontendOrigins = str('FRONTEND_ORIGIN')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  for (const origin of frontendOrigins) {
    try {
      const url = new URL(origin);
      if (url.origin !== origin) problems.push(`FRONTEND_ORIGIN contient une origine mal formée : ${origin}`);
    } catch {
      problems.push(`FRONTEND_ORIGIN contient une origine invalide : ${origin}`);
    }
  }

  const cookieSecure = bool('COOKIE_SECURE', nodeEnv === 'production');
  if (nodeEnv === 'production' && !cookieSecure) {
    problems.push('COOKIE_SECURE=false est interdit en production');
  }

  const config: AppConfigValues = {
    nodeEnv,
    port: int('PORT', 3000, 1, 65535),
    databaseUrl,
    jwtAccessSecret: secret('JWT_ACCESS_SECRET'),
    csrfSecret: secret('CSRF_SECRET'),
    jwtIssuer: str('JWT_ISSUER', 'taskora'),
    jwtAudience: str('JWT_AUDIENCE', 'taskora-web'),
    accessTokenTtlSeconds: int('ACCESS_TOKEN_TTL_SECONDS', 900),
    refreshTokenTtlSeconds: int('REFRESH_TOKEN_TTL_SECONDS', 604800),
    refreshReuseGraceSeconds: int('REFRESH_REUSE_GRACE_SECONDS', 10, 0, 60),
    frontendOrigins,
    cookieSecure,
    logLevel,
    swaggerEnabled: bool('SWAGGER_ENABLED', nodeEnv !== 'production'),
    trustProxy: bool('TRUST_PROXY', false),
    throttle: {
      global: { limit: int('THROTTLE_GLOBAL_LIMIT', 120), ttlMs: int('THROTTLE_GLOBAL_TTL_SECONDS', 60) * 1000 },
      login: { limit: int('THROTTLE_LOGIN_LIMIT', 5), ttlMs: int('THROTTLE_LOGIN_TTL_SECONDS', 900) * 1000 },
      register: { limit: int('THROTTLE_REGISTER_LIMIT', 3), ttlMs: int('THROTTLE_REGISTER_TTL_SECONDS', 3600) * 1000 },
      refresh: { limit: int('THROTTLE_REFRESH_LIMIT', 30), ttlMs: int('THROTTLE_REFRESH_TTL_SECONDS', 600) * 1000 },
    },
  };

  if (config.jwtAccessSecret && config.jwtAccessSecret === config.csrfSecret) {
    problems.push('JWT_ACCESS_SECRET et CSRF_SECRET doivent être différents');
  }
  if (problems.length > 0) throw new ConfigValidationError(problems);
  return config;
}

/** Configuration typée injectable, validée une seule fois au démarrage. */
@Injectable()
export class AppConfig {
  readonly values: AppConfigValues;

  constructor(values?: AppConfigValues) {
    this.values = values ?? loadConfig();
  }

  get isProduction(): boolean {
    return this.values.nodeEnv === 'production';
  }
}
