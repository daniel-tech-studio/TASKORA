import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app-exception';
import { AppLogger } from '../common/logging/app-logger';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/users.dto';
import { toUserPublic, UserPublicDto } from './user-public';

const WRONG_PASSWORD = { currentPassword: ['Le mot de passe actuel est incorrect.'] };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly logger: AppLogger,
  ) {}

  async getProfile(userId: string): Promise<UserPublicDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppException.unauthorized();
    return toUserPublic(user);
  }

  /** Nom/fuseau librement ; email uniquement avec le mot de passe actuel (backend.md D3). */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserPublicDto> {
    const { name, email, currentPassword, timeZone } = dto;
    if (name === undefined && email === undefined && timeZone === undefined) {
      throw AppException.validation({ _: ['Aucune modification fournie'] });
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppException.unauthorized();

    const emailChanges = email !== undefined && email !== user.email;
    if (emailChanges) {
      if (!currentPassword) {
        throw AppException.validation({ currentPassword: ["Le mot de passe actuel est requis pour changer d'adresse e-mail."] });
      }
      if (!(await this.passwords.verify(user.passwordHash, currentPassword))) {
        throw AppException.validation(WRONG_PASSWORD, 'Mot de passe actuel incorrect');
      }
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(emailChanges ? { email } : {}),
          ...(timeZone !== undefined ? { timeZone } : {}),
        },
      });
      if (emailChanges) this.logger.event('info', 'email_changed', { userId });
      return toUserPublic(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw AppException.emailAlreadyUsed();
      }
      throw error;
    }
  }

  /**
   * Changement de mot de passe : mot de passe actuel obligatoire ; les autres sessions
   * sont révoquées, la session courante est conservée (convention sécurité, backend.md D3/H6).
   */
  async changePassword(userId: string, sessionId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppException.unauthorized();
    if (!(await this.passwords.verify(user.passwordHash, dto.currentPassword))) {
      throw AppException.validation(WRONG_PASSWORD, 'Mot de passe actuel incorrect');
    }
    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    const revoked = await this.sessions.revokeOthers(userId, sessionId);
    this.logger.event('info', 'password_changed', { userId, revokedSessions: revoked });
  }
}
