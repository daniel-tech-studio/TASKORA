import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength, Validate } from 'class-validator';
import { NormalizeEmail, Trim } from '../../common/validation/transforms';
import { IsTimeZone } from '../../common/validation/is-time-zone';
import { PASSWORD_MAX, PASSWORD_MIN } from '../../auth/dto/auth.dto';

export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Le nom doit être une chaîne' })
  @Length(1, 100, { message: 'Le nom doit contenir entre 1 et 100 caractères' })
  name?: string;

  @ApiPropertyOptional({ description: 'Exige currentPassword' })
  @IsOptional()
  @NormalizeEmail()
  @IsString()
  @MaxLength(254, { message: "L'adresse e-mail est trop longue" })
  @IsEmail({}, { message: "L'adresse e-mail n'est pas valide" })
  email?: string;

  @ApiPropertyOptional({ description: "Obligatoire pour changer l'adresse e-mail" })
  @IsOptional()
  @IsString()
  @MaxLength(PASSWORD_MAX)
  currentPassword?: string;

  @ApiPropertyOptional({ example: 'Europe/Paris' })
  @IsOptional()
  @IsString()
  @Validate(IsTimeZone)
  timeZone?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString({ message: 'Le mot de passe actuel est obligatoire' })
  @MinLength(1, { message: 'Le mot de passe actuel est obligatoire' })
  @MaxLength(PASSWORD_MAX)
  currentPassword: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsString({ message: 'Le nouveau mot de passe est obligatoire' })
  @MinLength(PASSWORD_MIN, { message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères` })
  @MaxLength(PASSWORD_MAX, { message: `Le mot de passe doit contenir au plus ${PASSWORD_MAX} caractères` })
  newPassword: string;
}
