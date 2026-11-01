import { Transform } from 'class-transformer';

/** Trim des chaînes (les autres types sont laissés tels quels pour être refusés par la validation). */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** Email normalisé : trim + minuscules (backend.md C1). */
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
