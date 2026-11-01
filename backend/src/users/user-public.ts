import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@prisma/client';

/** Profil public : jamais de passwordHash (backend.md C1). */
export class UserPublicDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Awa Dossou' }) name: string;
  @ApiProperty({ example: 'awa@exemple.com' }) email: string;
  @ApiProperty({ example: 'Africa/Porto-Novo', description: 'Fuseau IANA utilisé pour le calcul des retards' })
  timeZone: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export function toUserPublic(user: User): UserPublicDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timeZone: user.timeZone,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
