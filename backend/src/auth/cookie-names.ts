import type { CookieOptions, Request, Response } from 'express';
import { AppConfig } from '../config/app-config';

/**
 * Politique de cookies (backend.md D2 / E2).
 * HTTPS (COOKIE_SECURE=true) : préfixe __Host-, Secure, Path=/, sans Domain.
 * Développement HTTP localhost : mêmes attributs sans Secure ni préfixe __Host-
 * (un cookie __Host- exige Secure) ; cette adaptation est limitée à COOKIE_SECURE=false,
 * interdit en production par la validation de configuration.
 */
export class AuthCookies {
  readonly access: string;
  readonly refresh: string;
  readonly csrf: string;

  constructor(private readonly config: AppConfig) {
    const prefix = config.values.cookieSecure ? '__Host-' : '';
    this.access = `${prefix}taskora_access`;
    this.refresh = `${prefix}taskora_refresh`;
    this.csrf = `${prefix}taskora_csrf`;
  }

  private base(maxAgeSeconds?: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.values.cookieSecure,
      sameSite: 'lax',
      path: '/',
      ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds * 1000 } : {}),
    };
  }

  setSession(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie(this.access, accessToken, this.base(this.config.values.accessTokenTtlSeconds));
    res.cookie(this.refresh, refreshToken, this.base(this.config.values.refreshTokenTtlSeconds));
  }

  clearSession(res: Response): void {
    res.clearCookie(this.access, this.base());
    res.clearCookie(this.refresh, this.base());
  }

  setCsrf(res: Response, value: string): void {
    // Cookie de session navigateur (sans Max-Age), HttpOnly : seul le jeton signé dérivé est lisible par le frontend.
    res.cookie(this.csrf, value, { ...this.base(), sameSite: 'strict' });
  }

  read(req: Request, name: string): string | undefined {
    const value = (req.cookies as Record<string, unknown> | undefined)?.[name];
    return typeof value === 'string' && value.length > 0 && value.length < 4096 ? value : undefined;
  }
}
