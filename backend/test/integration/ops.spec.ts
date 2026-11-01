import { PrismaClient } from '@prisma/client';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupDatabase, resolveSqlitePath, verifyDatabase } from '../../scripts/sqlite-tools';
import { DEMO_EMAIL, runSeed, SeedRefusedError } from '../../prisma/seed';

describe('Exploitation SQLite (intégration, base de test migrée)', () => {
  const prisma = new PrismaClient();
  const dir = mkdtempSync(join(tmpdir(), 'taskora-test-'));
  afterAll(async () => {
    await prisma.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  });

  it('T23 — seed non demandé en production : refusé, aucune donnée injectée', async () => {
    await expect(runSeed(prisma, { NODE_ENV: 'production' })).rejects.toBeInstanceOf(SeedRefusedError);
    expect(await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })).toBeNull();
  });

  it('seed explicite hors production : idempotent', async () => {
    expect(await runSeed(prisma, { NODE_ENV: 'development' })).toEqual({ created: true, tasks: 8 });
    expect(await runSeed(prisma, { NODE_ENV: 'development' })).toEqual({ created: false, tasks: 8 });
  });

  it('T22 — sauvegarde puis restauration sur copie distincte : intégrité et données conservées', async () => {
    const source = resolveSqlitePath(process.env.DATABASE_URL!);
    const before = { users: await prisma.user.count(), tasks: await prisma.task.count() };
    const backup = join(dir, 'backup.db');
    await backupDatabase(source, backup);

    // Modification de la base en service après la sauvegarde.
    const owner = await prisma.user.findFirstOrThrow();
    await prisma.task.create({ data: { ownerId: owner.id, title: 'Après sauvegarde', titleSort: 'apres sauvegarde', searchText: 'apres sauvegarde' } });

    const report = await verifyDatabase(backup);
    expect(report.integrity).toBe('ok');
    expect(report.users).toBe(before.users);
    expect(report.tasks).toBe(before.tasks);
    expect(report.migrations.length).toBeGreaterThanOrEqual(2);

    // Restauration sur une base séparée et utilisation via Prisma.
    const restored = new PrismaClient({ datasourceUrl: `file:${backup}` });
    try {
      expect(await restored.task.count({ where: { title: 'Après sauvegarde' } })).toBe(0);
      expect(await restored.user.findUnique({ where: { email: DEMO_EMAIL } })).not.toBeNull();
    } finally {
      await restored.$disconnect();
    }
    await expect(backupDatabase(source, backup)).rejects.toThrow(/existe déjà/);
    expect(existsSync(backup)).toBe(true);
  });

  it('contraintes CHECK et clés étrangères actives', async () => {
    const owner = await prisma.user.findFirstOrThrow();
    await expect(prisma.task.create({ data: { ownerId: owner.id, title: 'x', status: 'ARCHIVED' } })).rejects.toThrow();
    await expect(prisma.task.create({ data: { ownerId: owner.id, title: '   ' } })).rejects.toThrow();
    await expect(prisma.task.create({ data: { ownerId: 'inexistant', title: 'x' } })).rejects.toThrow();
  });
});
