import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfig } from '../../config/app-config';
import { AuthCookies } from '../../auth/cookie-names';
import { TokenService } from '../../auth/token.service';
import { AppException } from '../errors/app-exception';
import { AppLogger } from '../logging/app-logger';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-csrf-token';

/** Liaison de session du jeton CSRF : identifiant de session du cookie refresh, ou « anon ». */
export function csrfBinding(req: Request, cookies: AuthCookies, tokens: TokenService): string {
  return tokens.sessionIdOf(cookies.read(req, cookies.refresh)) ?? 'anon';
}

/**
 * Protection CSRF de toutes les mutations, y compris login/register/refresh/logout (backend.md E2) :
 * 1. en-tête Origin (ou à défaut Referer) appartenant aux origines autorisées ;
 * 2. en-tête X-CSRF-Token égal au HMAC(secret, cookie CSRF | session).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly config: AppConfig,
    private readonly cookies: AuthCookies,
    private readonly tokens: TokenService,
    private readonly logger: AppLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;

    const origin = this.requestOrigin(req);
    if (!origin || !this.config.values.frontendOrigins.includes(origin)) {
      return this.reject(req, 'origin');
    }

    const seed = this.cookies.read(req, this.cookies.csrf);
    const provided = req.header(CSRF_HEADER);
    if (!seed || !provided) return this.reject(req, 'missing_token');

    const expected = this.tokens.csrfToken(seed, csrfBinding(req, this.cookies, this.tokens));
    if (!this.tokens.csrfMatches(expected, provided)) return this.reject(req, 'invalid_token');
    return true;
  }

  private requestOrigin(req: Request): string | null {
    const origin = req.header('origin');
    if (origin && origin !== 'null') return origin;
    const referer = req.header('referer');
    if (!referer) return null;
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  private reject(req: Request, reason: string): never {
    this.logger.event('warn', 'csrf_rejected', { requestId: req.requestId, reason, path: req.path });
    throw AppException.csrf();
  }
}
