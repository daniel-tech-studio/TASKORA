export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'CSRF_INVALID'
  | 'NOT_FOUND'
  | 'EMAIL_ALREADY_USED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

/** Erreur normalisée (backend.md D8) ; NETWORK_ERROR = serveur injoignable. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details: Record<string, string[]> = {},
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  fieldError(field: string): string | undefined {
    return this.details[field]?.[0];
  }

  get isNetwork(): boolean {
    return this.code === 'NETWORK_ERROR';
  }
}

/** Message utilisateur lisible pour une erreur quelconque. */
export function errorMessage(error: unknown, fallback = 'Une erreur est survenue. Réessayez.'): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.';
      case 'RATE_LIMITED':
        return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
      case 'INTERNAL_ERROR':
        return 'Le service rencontre un problème. Réessayez dans un instant.';
      case 'VALIDATION_ERROR':
        return error.message && error.message !== 'Données invalides' ? error.message : 'Certaines informations sont invalides.';
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}
