import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { AppConfig } from '../config/app-config';

export interface AccessPayload {
  sub: string;
  sid: string;
  jti: string;
}

const REFRESH_FORMAT = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;

/**
 * Jetons : access JWT HS256 (iss, aud, sub, sid, exp, jti contrôlés, alg=none refusé)
 * et refresh opaque « <sessionId>.<secret CSPRNG> » dont seule l'empreinte SHA-256 est stockée.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  signAccess(userId: string, sessionId: string): Promise<string> {
    return this.jwt.signAsync(
      { sid: sessionId },
      {
        algorithm: 'HS256',
        secret: this.config.values.jwtAccessSecret,
        subject: userId,
        jwtid: randomUUID(),
        issuer: this.config.values.jwtIssuer,
        audience: this.config.values.jwtAudience,
        expiresIn: this.config.values.accessTokenTtlSeconds,
      },
    );
  }

  async verifyAccess(token: string, ignoreExpiration = false): Promise<AccessPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        algorithms: ['HS256'],
        secret: this.config.values.jwtAccessSecret,
        issuer: this.config.values.jwtIssuer,
        audience: this.config.values.jwtAudience,
        ignoreExpiration,
      });
      const { sub, sid, jti } = payload;
      if (typeof sub !== 'string' || typeof sid !== 'string' || typeof jti !== 'string') return null;
      return { sub, sid, jti };
    } catch {
      return null;
    }
  }

  newRefreshToken(sessionId: string): string {
    return `${sessionId}.${randomBytes(32).toString('base64url')}`;
  }

  hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Identifiant de session porté par un refresh token bien formé (non secret, non vérifié). */
  sessionIdOf(refreshToken: string | undefined): string | null {
    const match = refreshToken ? REFRESH_FORMAT.exec(refreshToken) : null;
    return match ? match[1] : null;
  }

  isWellFormedRefresh(token: string): boolean {
    return REFRESH_FORMAT.test(token);
  }

  // --- CSRF : jeton HMAC lié au cookie CSRF et à la session (double-submit signé, E2). ---

  newCsrfSeed(): string {
    return randomBytes(32).toString('base64url');
  }

  csrfToken(seed: string, sessionBinding: string): string {
    return createHmac('sha256', this.config.values.csrfSecret).update(`${seed}|${sessionBinding}`).digest('base64url');
  }

  csrfMatches(expected: string, provided: string): boolean {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
