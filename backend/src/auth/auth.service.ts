import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app-exception';
import { AppLogger } from '../common/logging/app-logger';
import { PasswordService } from './password.service';
import { IssuedSession, SessionService } from './session.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { toUserPublic, UserPublicDto } from '../users/user-public';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly logger: AppLogger,
  ) {}

  /** Inscription : compte actif immédiatement et session ouverte (backend.md D2). */
  async register(dto: RegisterDto): Promise<{ user: UserPublicDto; session: IssuedSession }> {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, passwordHash, timeZone: dto.timeZone ?? 'UTC' },
      });
      const session = await this.sessions.open(user.id);
      this.logger.event('info', 'user_registered', { userId: user.id });
      return { user: toUserPublic(user), session };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw AppException.emailAlreadyUsed();
      }
      throw error;
    }
  }

  /** Connexion : message uniforme, sans révéler l'existence de l'email (backend.md D8). */
  async login(dto: LoginDto): Promise<{ user: UserPublicDto; session: IssuedSession }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      await this.passwords.burnTime(dto.password);
      this.logger.event('info', 'login_failed', {});
      throw AppException.unauthorized('Adresse e-mail ou mot de passe incorrect.');
    }
    const valid = await this.passwords.verify(user.passwordHash, dto.password);
    if (!valid) {
      this.logger.event('info', 'login_failed', { userId: user.id });
      throw AppException.unauthorized('Adresse e-mail ou mot de passe incorrect.');
    }
    const session = await this.sessions.open(user.id);
    this.logger.event('info', 'login_succeeded', { userId: user.id, sessionId: session.sessionId });
    void this.sessions.purgeExpired().catch(() => undefined);
    return { user: toUserPublic(user), session };
  }

  async publicProfile(userId: string): Promise<UserPublicDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppException.unauthorized();
    return toUserPublic(user);
  }

  async me(userId: string, sessionId: string) {
    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.session.findUnique({ where: { id: sessionId } }),
    ]);
    if (!user || !session) throw AppException.unauthorized();
    return {
      user: toUserPublic(user),
      session: { id: session.id, createdAt: session.createdAt.toISOString(), expiresAt: session.expiresAt.toISOString() },
    };
  }
}
