import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const PRISMA_DIR = resolve(__dirname, '../prisma');

/** Résout un DATABASE_URL « file:… » comme Prisma (relatif au dossier prisma/). */
export function resolveSqlitePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) throw new Error('DATABASE_URL doit commencer par file:');
  const raw = databaseUrl.slice('file:'.length).split('?')[0];
  return isAbsolute(raw) ? raw : resolve(PRISMA_DIR, raw);
}

function client(file: string): PrismaClient {
  return new PrismaClient({ datasourceUrl: `file:${file}` });
}

export interface VerifyReport {
  file: string;
  integrity: string;
  users: number;
  tasks: number;
  sessions: number;
  migrations: string[];
}

/**
 * Sauvegarde cohérente à chaud via VACUUM INTO (backend.md F5) : n'utilise jamais une copie
 * naïve d'un fichier actif en WAL. La cible ne doit pas exister.
 */
export async function backupDatabase(sourceFile: string, targetFile: string): Promise<void> {
  if (!existsSync(sourceFile)) throw new Error(`Base introuvable : ${sourceFile}`);
  if (existsSync(targetFile)) throw new Error(`La cible existe déjà : ${targetFile}`);
  mkdirSync(dirname(targetFile), { recursive: true });
  const db = client(sourceFile);
  try {
    await db.$executeRawUnsafe(`VACUUM INTO '${targetFile.replace(/'/g, "''")}'`);
  } finally {
    await db.$disconnect();
  }
}

/** Contrôle d'intégrité et inventaire d'une base (sauvegarde ou copie restaurée). */
export async function verifyDatabase(file: string): Promise<VerifyReport> {
  if (!existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  const db = client(file);
  try {
    const [check] = await db.$queryRawUnsafe<{ integrity_check: string }[]>('PRAGMA integrity_check;');
    const migrations = await db.$queryRawUnsafe<{ migration_name: string }[]>(
      'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name',
    );
    return {
      file,
      integrity: check.integrity_check,
      users: await db.user.count(),
      tasks: await db.task.count(),
      sessions: await db.session.count(),
      migrations: migrations.map((m) => m.migration_name),
    };
  } finally {
    await db.$disconnect();
  }
}
