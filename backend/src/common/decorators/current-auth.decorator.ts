import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthContext } from '../../types/auth-context';

/** Contexte d'authentification vérifié par AuthGuard (jamais issu du corps ou de la query). */
export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return req.auth!;
});
