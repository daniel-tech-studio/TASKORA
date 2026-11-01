/** Validation locale de forme, alignée sur le service (backend.md D2/E1). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NAME_MAX = 100;

export function isEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function passwordError(value: string): string | undefined {
  if (!value) return 'Le mot de passe est obligatoire.';
  if (value.length < PASSWORD_MIN) return `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`;
  if (value.length > PASSWORD_MAX) return `Le mot de passe doit contenir au plus ${PASSWORD_MAX} caractères.`;
  return undefined;
}
