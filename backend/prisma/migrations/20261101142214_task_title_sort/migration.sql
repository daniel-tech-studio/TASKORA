-- Clé de tri alphabétique normalisée. ALTER TABLE ADD COLUMN plutôt que la redéfinition
-- de table générée par Prisma, afin de conserver les contraintes CHECK de la migration initiale.
ALTER TABLE "Task" ADD COLUMN "titleSort" TEXT NOT NULL DEFAULT '';

-- Rétro-remplissage (approximation SQLite : lower() n'agit que sur l'ASCII ; toute
-- modification ultérieure du titre recalcule la clé normalisée côté service).
UPDATE "Task" SET "titleSort" = lower("title");
