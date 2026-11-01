import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentAuth } from '../common/decorators/current-auth.decorator';
import { ErrorResponseDto } from '../common/errors/error-response.dto';
import type { AuthContext } from '../types/auth-context';
import { ChangePasswordDto, UpdateProfileDto } from './dto/users.dto';
import { UserPublicDto } from './user-public';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth('access')
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lire son profil' })
  @ApiOkResponse({ type: UserPublicDto })
  me(@CurrentAuth() auth: AuthContext): Promise<UserPublicDto> {
    return this.users.getProfile(auth.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: "Modifier nom, email (mot de passe actuel requis) ou fuseau" })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOkResponse({ type: UserPublicDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'EMAIL_ALREADY_USED' })
  update(@CurrentAuth() auth: AuthContext, @Body() dto: UpdateProfileDto): Promise<UserPublicDto> {
    return this.users.updateProfile(auth.userId, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Changer de mot de passe (révoque les autres sessions)' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  changePassword(@CurrentAuth() auth: AuthContext, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.users.changePassword(auth.userId, auth.sessionId, dto);
  }
}
