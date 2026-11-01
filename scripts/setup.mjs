// Installation en une commande : dépendances, configuration (.env avec secrets générés),
// base de données migrée, compilation de l'API. Peut être relancé sans risque.
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');

const step = (n, text) => console.log(`\n\x1b[35m[${n}/5]\x1b[0m ${text}`);
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 11)) {
  console.error(`Node.js ${process.versions.node} est trop ancien : installez Node.js 22 LTS (https://nodejs.org).`);
  process.exit(1);
}

step(1, 'Installation des dépendances du serveur…');
run('npm ci', backend);

step(2, "Installation des dépendances de l'interface…");
run('npm ci', frontend);

step(3, 'Configuration…');
const envFile = join(backend, '.env');
if (!existsSync(envFile)) {
  const secret = () => randomBytes(48).toString('base64url');
  const content = readFileSync(join(backend, '.env.example'), 'utf8')
    .replace(/^JWT_ACCESS_SECRET=.*$/m, `JWT_ACCESS_SECRET=${secret()}`)
    .replace(/^CSRF_SECRET=.*$/m, `CSRF_SECRET=${secret()}`);
  writeFileSync(envFile, content, { mode: 0o600 });
  console.log('backend/.env créé avec des secrets générés aléatoirement.');
} else {
  console.log('backend/.env existe déjà : conservé.');
}
if (!existsSync(join(frontend, '.env.local'))) {
  copyFileSync(join(frontend, '.env.example'), join(frontend, '.env.local'));
  console.log('frontend/.env.local créé.');
}
mkdirSync(join(backend, 'prisma', 'data'), { recursive: true });

step(4, 'Création / mise à jour de la base de données…');
run('npx prisma migrate deploy', backend);

step(5, 'Compilation du serveur…');
run('npm run build', backend);

console.log('\n\x1b[32mInstallation terminée.\x1b[0m Lancez maintenant : npm start');
console.log('(Facultatif) Données de démonstration : npm run demo');
