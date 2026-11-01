import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthCookies } from '../../auth/cookie-names';
import { SessionService } from '../../auth/session.service';
import { TokenService } from '../../auth/token.service';
import { AppException } from '../errors/app-exception';
import { IS_PUBLIC } from '../decorators/public.decorator';

/**
 * Guard global : JWT d'accès (cookie HttpOnly) valide ET session non révoquée/non expirée
 * (backend.md D1, E3). Les routes @Public() en sont exemptées.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cookies: AuthCookies,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.cookies.read(req, this.cookies.access);
    if (!token) throw AppException.unauthorized();

    const payload = await this.tokens.verifyAccess(token);
    if (!payload) throw AppException.unauthorized('Session expirée');

    const session = await this.sessions.findActive(payload.sid, payload.sub);
    if (!session) throw AppException.unauthorized('Session expirée');

    req.auth = { userId: session.user.id, sessionId: session.id, timeZone: session.user.timeZone };
    return true;
  }
}
