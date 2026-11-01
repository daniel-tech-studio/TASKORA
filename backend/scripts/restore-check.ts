/**
 * npm run db:restore-check -- <sauvegarde.db>
 * Teste la restauration sur une base SÉPARÉE (copie temporaire) : intégrité, migrations,
 * inventaire. Ne touche jamais la base en service.
 */
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { verifyDatabase } from './sqlite-tools';

async function main(): Promise<void> {
  const backup = process.argv[2];
  if (!backup) throw new Error('Usage : npm run db:restore-check -- <chemin de la sauvegarde>');
  const dir = mkdtempSync(join(tmpdir(), 'taskora-restore-'));
  const restored = join(dir, 'restored.db');
  try {
    copyFileSync(resolve(backup), restored); // une sauvegarde VACUUM INTO est un fichier autonome (sans WAL)
    const report = await verifyDatabase(restored);
    if (report.integrity !== 'ok') throw new Error(`Intégrité KO : ${report.integrity}`);
    console.log(JSON.stringify({ event: 'restore_check_ok', backup: resolve(backup), ...report, file: undefined }, null, 2));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
