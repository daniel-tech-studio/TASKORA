import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Charge backend/.env si présent (sans écraser l'environnement réel du processus). */
export function loadEnvFile(path = resolve(__dirname, '../../.env')): void {
  const candidate = existsSync(path) ? path : resolve(process.cwd(), '.env');
  if (existsSync(candidate)) process.loadEnvFile(candidate);
}
