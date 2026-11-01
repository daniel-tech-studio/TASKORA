import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentAuth } from '../common/decorators/current-auth.decorator';
import { ThrottleRuleFor } from '../common/decorators/throttle-rules';
import { csrfBinding } from '../common/guards/csrf.guard';
import { AppException } from '../common/errors/app-exception';
import { ErrorResponseDto } from '../common/errors/error-response.dto';
import type { AuthContext } from '../types/auth-context';
import { AuthCookies } from './cookie-names';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { CsrfTokenDto, LoginDto, MeDto, RegisterDto } from './dto/auth.dto';
import { UserPublicDto } from '../users/user-public';
import { AppLogger } from '../common/logging/app-logger';

const CSRF_HEADER_DOC = { name: 'X-CSRF-Token', required: true, description: 'Jeton obtenu via GET /auth/csrf' };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly cookies: AuthCookies,
    private readonly logger: AppLogger,
  ) {}

  @Get('csrf')
  @Public()
  @ApiOperation({ summary: 'Obtenir le jeton CSRF (bootstrap avant authentification, à renouveler après login/register/logout)' })
  @ApiOkResponse({ type: CsrfTokenDto })
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response): CsrfTokenDto {
    let seed = this.cookies.read(req, this.cookies.csrf);
    if (!seed) {
      seed = this.tokens.newCsrfSeed();
      this.cookies.setCsrf(res, seed);
    }
    res.setHeader('Cache-Control', 'no-store');
    return { csrfToken: this.tokens.csrfToken(seed, csrfBinding(req, this.cookies, this.tokens)) };
  }

  @Post('register')
  @Public()
  @ThrottleRuleFor('register')
  @ApiOperation({ summary: 'Créer un compte ; la session est ouverte immédiatement' })
  @ApiHeader(CSRF_HEADER_DOC)
  @ApiCreatedResponse({ type: UserPublicDto, description: 'Cookies de session posés' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'EMAIL_ALREADY_USED' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'CSRF_INVALID' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<UserPublicDto> {
    const { user, session } = await this.auth.register(dto);
    this.cookies.setSession(res, session.accessToken, session.refreshToken);
    return user;
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ThrottleRuleFor('login')
  @ApiOperation({ summary: 'Se connecter (nouvelle session ; les autres sessions restent actives)' })
  @ApiHeader(CSRF_HEADER_DOC)
  @ApiOkResponse({ type: UserPublicDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Identifiants invalides (message générique)' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<UserPublicDto> {
    const { user, session } = await this.auth.login(dto);
    this.cookies.setSession(res, session.accessToken, session.refreshToken);
    return user;
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ThrottleRuleFor('refresh')
  @ApiOperation({ summary: 'Renouveler les cookies (rotation du refresh token, détection de réutilisation)' })
  @ApiCookieAuth('refresh')
  @ApiHeader(CSRF_HEADER_DOC)
  @ApiOkResponse({ type: UserPublicDto, description: 'Cookies renouvelés ; identité publique minimale' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<UserPublicDto> {
    const outcome = await this.sessions.rotate(this.cookies.read(req, this.cookies.refresh));
    if (outcome.kind === 'rejected') {
      // En cas de course légitime, ne pas effacer les cookies qu'une requête concurrente vient de renouveler.
      if (outcome.reason !== 'race') this.cookies.clearSession(res);
      throw AppException.unauthorized('Session expirée');
    }
    this.cookies.setSession(res, outcome.session.accessToken, outcome.session.refreshToken);
    return this.auth.publicProfile(outcome.session.userId);
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Se déconnecter : révoque la session courante et efface les cookies' })
  @ApiHeader(CSRF_HEADER_DOC)
  @ApiNoContentResponse()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const access = this.cookies.read(req, this.cookies.access);
    const payload = access ? await this.tokens.verifyAccess(access, true) : null;
    const sessionId = payload?.sid ?? this.tokens.sessionIdOf(this.cookies.read(req, this.cookies.refresh));
    if (sessionId) {
      await this.sessions.revoke(sessionId);
      this.logger.event('info', 'logout', { sessionId });
    }
    this.cookies.clearSession(res);
  }

  @Get('me')
  @ApiOperation({ summary: 'Profil public et état de la session courante' })
  @ApiCookieAuth('access')
  @ApiOkResponse({ type: MeDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  me(@CurrentAuth() auth: AuthContext): Promise<MeDto> {
    return this.auth.me(auth.userId, auth.sessionId);
  }
}
