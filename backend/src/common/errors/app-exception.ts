import { HttpException, HttpStatus } from '@nestjs/common';

/** Codes d'erreur normalisés (backend.md D8). */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'CSRF_INVALID'
  | 'NOT_FOUND'
  | 'EMAIL_ALREADY_USED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type ErrorDetails = Record<string, string[]>;

export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: ErrorDetails,
  ) {
    super({ code, message, details }, status);
  }

  static validation(details: ErrorDetails, message = 'Données invalides'): AppException {
    return new AppException('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, details);
  }

  static unauthorized(message = 'Authentification requise'): AppException {
    return new AppException('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }

  static csrf(message = 'Requête refusée (protection CSRF)'): AppException {
    return new AppException('CSRF_INVALID', message, HttpStatus.FORBIDDEN);
  }

  static notFound(message = 'Ressource introuvable'): AppException {
    return new AppException('NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }

  static emailAlreadyUsed(): AppException {
    return new AppException(
      'EMAIL_ALREADY_USED',
      'Cette adresse e-mail est déjà utilisée.',
      HttpStatus.CONFLICT,
      { email: ['Cette adresse e-mail est déjà utilisée.'] },
    );
  }
}
