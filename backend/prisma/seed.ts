/**
 * Seed pédagogique — backend.md F4. Exécuté UNIQUEMENT sur commande explicite (npm run db:seed),
 * refusé en production sans opt-in explicite (SEED_ALLOW_PRODUCTION=true).
 * Données entièrement fictives : compte de démonstration demo@taskora.test.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { resolve } from 'node:path';
import { loadEnvFile } from '../src/config/env-file';
import { buildSearchText, normalizeSearch, PRIORITY_RANK, TaskPriority, TaskStatus } from '../src/tasks/task.constants';

export const DEMO_EMAIL = 'demo@taskora.test';
export const DEMO_PASSWORD = 'taskora-demo-2026'; // identifiant fictif, documenté dans le README

export class SeedRefusedError extends Error {}

function civil(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function runSeed(prisma: PrismaClient, env: NodeJS.ProcessEnv = process.env): Promise<{ created: boolean; tasks: number }> {
  if (env.NODE_ENV === 'production' && env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new SeedRefusedError('Seed refusé : NODE_ENV=production (définir SEED_ALLOW_PRODUCTION=true pour forcer).');
  }
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) return { created: false, tasks: await prisma.task.count({ where: { ownerId: existing.id } }) };

  const user = await prisma.user.create({
    data: {
      name: 'Camille Démo',
      email: DEMO_EMAIL,
      passwordHash: await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      timeZone: env.SEED_TIME_ZONE ?? 'Africa/Porto-Novo',
    },
  });
  const specs: { title: string; description?: string; status: TaskStatus; priority: TaskPriority; dueDate?: string }[] = [
    { title: 'Préparer la présentation du projet', description: 'Slides de synthèse et démo de 5 minutes.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: civil(2) },
    { title: 'Relire le rapport trimestriel', status: 'TODO', priority: 'HIGH', dueDate: civil(-2) },
    { title: 'Réserver la salle de réunion', status: 'TODO', priority: 'MEDIUM', dueDate: civil(5) },
    { title: 'Mettre à jour la documentation', description: 'Section installation et dépannage.', status: 'TODO', priority: 'LOW' },
    { title: 'Envoyer le compte rendu', status: 'DONE', priority: 'MEDIUM', dueDate: civil(-1) },
    { title: 'Planifier les objectifs de la semaine', status: 'DONE', priority: 'HIGH' },
    { title: 'Faire le point avec le mentor', status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: civil(1) },
    { title: 'Ranger le bureau', status: 'TODO', priority: 'LOW', dueDate: civil(10) },
  ];
  for (const spec of specs) {
    await prisma.task.create({
      data: {
        ownerId: user.id,
        title: spec.title,
        description: spec.description ?? null,
        status: spec.status,
        priority: spec.priority,
        priorityRank: PRIORITY_RANK[spec.priority],
        dueDate: spec.dueDate ?? null,
        completedAt: spec.status === 'DONE' ? new Date() : null,
        searchText: buildSearchText(spec.title, spec.description ?? null),
        titleSort: normalizeSearch(spec.title),
      },
    });
  }
  return { created: true, tasks: specs.length };
}

if (require.main === module) {
  loadEnvFile(resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  runSeed(prisma)
    .then((r) => console.log(r.created ? `Seed : ${DEMO_EMAIL} créé avec ${r.tasks} tâches.` : `Seed : ${DEMO_EMAIL} existe déjà (${r.tasks} tâches), rien à faire.`))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
