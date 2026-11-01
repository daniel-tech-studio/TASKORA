/**
 * npm run db:backup [-- <fichier cible>]
 * Crée un instantané cohérent de la base courante puis vérifie son intégrité.
 */
import { resolve } from 'node:path';
import { loadEnvFile } from '../src/config/env-file';
import { backupDatabase, resolveSqlitePath, verifyDatabase } from './sqlite-tools';

async function main(): Promise<void> {
  loadEnvFile(resolve(__dirname, '../.env'));
  const source = resolveSqlitePath(process.env.DATABASE_URL ?? '');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = resolve(process.argv[2] ?? resolve(__dirname, `../backups/taskora-${stamp}.db`));
  await backupDatabase(source, target);
  const report = await verifyDatabase(target);
  if (report.integrity !== 'ok') throw new Error(`Intégrité KO : ${report.integrity}`);
  console.log(JSON.stringify({ event: 'backup_created', ...report }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
