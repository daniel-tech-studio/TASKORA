import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/app-config';
import { Clock } from '../common/time/clock';
import { AppLogger } from '../common/logging/app-logger';
import { TokenService } from './token.service';
import { randomUUID } from 'node:crypto';

export interface IssuedSession {
  sessionId: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export type RefreshOutcome =
  | { kind: 'rotated'; session: IssuedSession }
  | { kind: 'rejected'; reason: 'missing' | 'unknown' | 'expired' | 'revoked' | 'race' | 'reused' };

/**
 * Sessions multiples, rotation atomique des refresh tokens et détection de réutilisation
 * (backend.md C1 Session, C5, B06, H3, H7).
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

  private refreshExpiry(now: Date): Date {
    return new Date(now.getTime() + this.config.values.refreshTokenTtlSeconds * 1000);
  }

  async open(userId: string): Promise<IssuedSession> {
    const now = this.clock.now();
    const sessionId = randomUUID();
    const refreshToken = this.tokens.newRefreshToken(sessionId);
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        familyId: randomUUID(),
        refreshTokenHash: this.tokens.hashRefresh(refreshToken),
        createdAt: now,
        expiresAt: this.refreshExpiry(now),
        lastUsedAt: now,
      },
    });
    const accessToken = await this.tokens.signAccess(userId, sessionId);
    return { sessionId, userId, accessToken, refreshToken };
  }

  async rotate(refreshToken: string | undefined): Promise<RefreshOutcome> {
    if (!refreshToken || !this.tokens.isWellFormedRefresh(refreshToken)) return { kind: 'rejected', reason: 'missing' };
    const now = this.clock.now();
    const oldHash = this.tokens.hashRefresh(refreshToken);

    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: oldHash } });
    if (!session) return this.handleUnknown(oldHash, now);
    if (session.revokedAt) return { kind: 'rejected', reason: 'revoked' };
    if (session.expiresAt <= now) return { kind: 'rejected', reason: 'expired' };

    const newToken = this.tokens.newRefreshToken(session.id);
    const rotated = await this.prisma.$transaction(async (tx) => {
      // Mise à jour conditionnelle : un seul refresh concurrent peut consommer ce jeton.
      const { count } = await tx.session.updateMany({
        where: { id: session.id, refreshTokenHash: oldHash, revokedAt: null, expiresAt: { gt: now } },
        data: { refreshTokenHash: this.tokens.hashRefresh(newToken), expiresAt: this.refreshExpiry(now), lastUsedAt: now },
      });
      if (count !== 1) return false;
      await tx.refreshTokenHistory.create({
        data: { sessionId: session.id, tokenHash: oldHash, consumedAt: now, expiresAt: session.expiresAt },
      });
      return true;
    });
    if (!rotated) return { kind: 'rejected', reason: 'race' };

    const accessToken = await this.tokens.signAccess(session.userId, session.id);
    return { kind: 'rotated', session: { sessionId: session.id, userId: session.userId, accessToken, refreshToken: newToken } };
  }

  private async handleUnknown(tokenHash: string, now: Date): Promise<RefreshOutcome> {
    const consumed = await this.prisma.refreshTokenHistory.findUnique({
      where: { tokenHash },
      include: { session: { select: { id: true, familyId: true, revokedAt: true } } },
    });
    if (!consumed) return { kind: 'rejected', reason: 'unknown' };

    const graceMs = this.config.values.refreshReuseGraceSeconds * 1000;
    if (now.getTime() - consumed.consumedAt.getTime() <= graceMs) {
      // Refresh légitimes rapprochés (plusieurs onglets) : pas de faux signalement de vol.
      this.logger.event('warn', 'refresh_race', { sessionId: consumed.sessionId });
      return { kind: 'rejected', reason: 'race' };
    }
    // Réutilisation d'un jeton déjà consommé : révocation de la famille concernée uniquement.
    await this.prisma.session.updateMany({
      where: { familyId: consumed.session.familyId, revokedAt: null },
      data: { revokedAt: now },
    });
    this.logger.event('warn', 'refresh_reuse_detected', { sessionId: consumed.sessionId });
    return { kind: 'rejected', reason: 'reused' };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: this.clock.now() } });
  }

  async revokeOthers(userId: string, keepSessionId: string): Promise<number> {
    const { count } = await this.prisma.session.updateMany({
      where: { userId, id: { not: keepSessionId }, revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
    return count;
  }

  /** Session active (non révoquée, non expirée) avec le fuseau de son utilisateur. */
  async findActive(sessionId: string, userId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: this.clock.now() } },
      select: { id: true, createdAt: true, expiresAt: true, user: { select: { id: true, timeZone: true } } },
    });
    return session;
  }

  /** Purge des sessions et empreintes expirées (appelée de façon opportuniste). */
  async purgeExpired(): Promise<void> {
    const now = this.clock.now();
    await this.prisma.refreshTokenHistory.deleteMany({ where: { expiresAt: { lte: now } } });
    await this.prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
  }
}
