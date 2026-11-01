import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppException, ErrorCode, ErrorDetails } from '../errors/app-exception';
import { AppLogger } from '../logging/app-logger';

interface ErrorBody {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
  requestId?: string;
}

const STATUS_CODES: Partial<Record<number, { code: ErrorCode; message: string }>> = {
  400: { code: 'VALIDATION_ERROR', message: 'Données invalides' },
  401: { code: 'UNAUTHORIZED', message: 'Authentification requise' },
  403: { code: 'CSRF_INVALID', message: 'Requête refusée' },
  404: { code: 'NOT_FOUND', message: 'Ressource introuvable' },
  413: { code: 'VALIDATION_ERROR', message: 'Requête trop volumineuse' },
  415: { code: 'VALIDATION_ERROR', message: 'Type de contenu non pris en charge' },
  429: { code: 'RATE_LIMITED', message: 'Trop de requêtes, réessayez plus tard.' },
};

/** Uniformise toutes les erreurs au format backend.md D8, sans stack trace ni SQL. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorBody = { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' };

    if (exception instanceof AppException) {
      status = exception.getStatus();
      body = { code: exception.code, message: exception.message, details: exception.details };
    } else if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      body = { code: 'RATE_LIMITED', message: 'Trop de tentatives, réessayez plus tard.' };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const mapped = STATUS_CODES[status];
      body = mapped
        ? { ...mapped }
        : { code: status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR', message: 'Requête invalide' };
    } else if (isBodyParserError(exception)) {
      status = exception.status;
      const mapped = STATUS_CODES[status] ?? STATUS_CODES[400]!;
      body = { ...mapped, message: status === 400 ? 'Corps JSON invalide' : mapped.message };
    }

    if (status >= 500) {
      // Journalisé côté serveur uniquement ; la réponse reste générique.
      this.logger.event('error', 'unhandled_exception', {
        requestId: req.requestId,
        name: exception instanceof Error ? exception.name : typeof exception,
        message: exception instanceof Error ? exception.message : undefined,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    body.requestId = req.requestId;
    res.locals.errorCode = body.code;
    if (!body.details) delete body.details;
    res.status(status).json(body);
  }
}

function isBodyParserError(e: unknown): e is { status: number; type: string } {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as { status?: unknown }).status === 'number' &&
    typeof (e as { type?: unknown }).type === 'string'
  );
}
