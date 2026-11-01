import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

export default function globalTeardown(): void {
  const name = process.env.TASKORA_TEST_DB ?? 'test.db';
  const file = resolve(__dirname, '../../prisma/data', name);
  for (const suffix of ['', '-wal', '-shm', '-journal']) rmSync(file + suffix, { force: true });
}
