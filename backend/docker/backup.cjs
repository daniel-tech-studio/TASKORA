// Sauvegarde cohérente à chaud dans le conteneur : VACUUM INTO + PRAGMA integrity_check.
// Usage : docker compose exec api node docker/backup.cjs
const { PrismaClient } = require('@prisma/client');

(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = `/app/data/backups/taskora-${stamp}.db`;
  require('node:fs').mkdirSync('/app/data/backups', { recursive: true });
  const db = new PrismaClient();
  await db.$executeRawUnsafe(`VACUUM INTO '${target}'`);
  await db.$disconnect();
  const copy = new PrismaClient({ datasourceUrl: `file:${target}` });
  const [check] = await copy.$queryRawUnsafe('PRAGMA integrity_check;');
  const users = await copy.user.count();
  const tasks = await copy.task.count();
  await copy.$disconnect();
  if (check.integrity_check !== 'ok') throw new Error(`Intégrité KO : ${check.integrity_check}`);
  console.log(JSON.stringify({ event: 'backup_created', file: target, integrity: 'ok', users, tasks }));
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
