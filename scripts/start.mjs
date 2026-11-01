// Lance l'API et l'interface ensemble ; Ctrl+C arrête les deux.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(root, 'backend', 'dist', 'main.js')) || !existsSync(join(root, 'backend', '.env'))) {
  console.error("L'application n'est pas encore installée : lancez d'abord  npm run setup");
  process.exit(1);
}

const envValue = (file, key, fallback) => {
  try {
    const match = readFileSync(file, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match?.[1].trim() || fallback;
  } catch {
    return fallback;
  }
};
const webPort = envValue(join(root, 'frontend', '.env.local'), 'FRONTEND_PORT', '5173');

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const children = [
  { name: 'api', color: 36, args: ['--prefix', 'backend', 'run', 'start:prod'] },
  { name: 'web', color: 35, args: ['--prefix', 'frontend', 'run', 'dev'] },
].map(({ name, color, args }) => {
  // Groupe de processus dédié (POSIX) : l'arrêt ferme aussi les processus petits-enfants (node, vite).
  const child = spawn(npm, args, { cwd: root, shell: isWindows, detached: !isWindows });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => stream.on('data', (d) => out.write(d.toString().replace(/^(?=.)/gm, prefix)));
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}arrêté (code ${code}).`);
    stopAll();
  });
  return child;
});

let stopping = false;
function stopAll() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      if (isWindows) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      else process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* déjà arrêté */
    }
  }
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

setTimeout(() => {
  console.log(`\n\x1b[32m  TASKORA est prêt :  http://localhost:${webPort}\x1b[0m   (Ctrl+C pour arrêter)\n`);
}, 4000);
