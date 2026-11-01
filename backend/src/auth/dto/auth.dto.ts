import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength, Validate } from 'class-validator';
import { NormalizeEmail, Trim } from '../../common/validation/transforms';
import { IsTimeZone } from '../../common/validation/is-time-zone';
import { UserPublicDto } from '../../users/user-public';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export class RegisterDto {
  @ApiProperty({ minLength: 1, maxLength: 100, example: 'Awa Dossou' })
  @Trim()
  @IsString({ message: 'Le nom est obligatoire' })
  @Length(1, 100, { message: 'Le nom doit contenir entre 1 et 100 caractères' })
  name: string;

  @ApiProperty({ example: 'awa@exemple.com' })
  @NormalizeEmail()
  @IsString({ message: "L'adresse e-mail est obligatoire" })
  @MaxLength(254, { message: "L'adresse e-mail est trop longue" })
  @IsEmail({}, { message: "L'adresse e-mail n'est pas valide" })
  email: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX, description: 'Espaces autorisés' })
  @IsString({ message: 'Le mot de passe est obligatoire' })
  @MinLength(PASSWORD_MIN, { message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères` })
  @MaxLength(PASSWORD_MAX, { message: `Le mot de passe doit contenir au plus ${PASSWORD_MAX} caractères` })
  password: string;

  @ApiPropertyOptional({ example: 'Africa/Porto-Novo', description: 'Fuseau IANA du navigateur ; UTC par défaut' })
  @IsOptional()
  @IsString()
  @Validate(IsTimeZone)
  timeZone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'awa@exemple.com' })
  @NormalizeEmail()
  @IsString({ message: "L'adresse e-mail est obligatoire" })
  @MaxLength(254)
  @IsEmail({}, { message: "L'adresse e-mail n'est pas valide" })
  email: string;

  @ApiProperty()
  @IsString({ message: 'Le mot de passe est obligatoire' })
  @MinLength(1, { message: 'Le mot de passe est obligatoire' })
  @MaxLength(PASSWORD_MAX)
  password: string;
}

export class CsrfTokenDto {
  @ApiProperty({ description: "À renvoyer dans l'en-tête X-CSRF-Token des requêtes mutatives" })
  csrfToken: string;
}

export class SessionInfoDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time', description: 'Expiration glissante du refresh token' }) expiresAt: string;
}

export class MeDto {
  @ApiProperty({ type: UserPublicDto }) user: UserPublicDto;
  @ApiProperty({ type: SessionInfoDto }) session: SessionInfoDto;
}
