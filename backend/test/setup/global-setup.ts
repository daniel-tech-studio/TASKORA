import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

/** Crée une base de test vierge et lui applique les migrations versionnées (backend.md F1). */
export default function globalSetup(): void {
  const name = process.env.TASKORA_TEST_DB ?? 'test.db';
  const file = resolve(__dirname, '../../prisma/data', name);
  for (const suffix of ['', '-wal', '-shm', '-journal']) rmSync(file + suffix, { force: true });
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: `file:./data/${name}` },
    stdio: 'ignore',
  });
}
