# TASKORA — État d'avancement

**Dernière mise à jour :** 1er novembre 2026. Ce fichier ne prévaut jamais sur le code et les tests : relancer les commandes ci-dessous pour vérifier.

## Synthèse
Les fonctionnalités V1 de `llm.md` et `backend.md` sont implémentées et vérifiées par des tests automatisés contre une vraie base SQLite et une vraie API. Aucune donnée simulée n'est utilisée par l'application livrée (les doubles de test n'existent que dans les tests unitaires du client HTTP et un test Playwright d'échec réseau).

## Tâches

| ID | Tâche | Statut | Preuve |
|---|---|---|---|
| FOUND-001 | Monorepo, `.gitignore`, scripts | DONE | `backend/`, `frontend/`, README |
| BACK-001 | NestJS strict, configuration validée, Prisma | DONE | `app-config.spec.ts` |
| BACK-002 | Schéma + migrations (`init`, `task_title_sort`), CHECK SQL | DONE | `ops.spec.ts` (contraintes) |
| BACK-003 | Validation stricte, erreurs D8, requestId, logs expurgés, helmet, CORS | DONE | `security.e2e-spec.ts`, `logging.e2e-spec.ts` |
| BACK-010 | Inscription/connexion/me/logout, Argon2id, cookies | DONE | `auth.e2e-spec.ts` T01–T03, T07, T08 |
| BACK-011 | Refresh rotatif atomique, historique, réutilisation, fenêtre de concurrence | DONE | T05, T06, test « refresh concurrents » |
| BACK-012 | CSRF signé lié à la session + Origin | DONE | T09 (5 cas) |
| BACK-013 | Limitation globale/login/inscription/refresh | DONE | `throttle.e2e-spec.ts` T04 |
| BACK-020 | Profil, email avec mot de passe actuel, mot de passe (révoque les autres sessions) | DONE | `users.e2e-spec.ts` T20 |
| BACK-030 | CRUD tâches, propriété, completedAt, dates civiles | DONE | T10–T13, T21 |
| BACK-031 | Liste paginée, recherche (casse/accents, jokers littéraux), filtres, tri stable, Kanban par colonne | DONE | T16, T17, T18 |
| BACK-032 | Statistiques + retard par fuseau (horloge injectable) | DONE | T14, T15, T19, frontières jour/mois/année/DST |
| BACK-040 | Swagger, seed explicite, backup/restore-check | DONE | T22, T23, test Swagger |
| BACK-041 | Journaux sans secrets | DONE | T24 |
| FRONT-001 | Tokens clair/sombre, polices, anti-flash | DONE | captures `docs/screenshots/`, test thème |
| FRONT-002 | Bibliothèque UI | DONE | Vitest + Playwright |
| FRONT-003 | AppShell sidebar/rail/bottom nav, thème, menu compte | DONE | `mobile.spec.ts`, captures tablette |
| FRONT-010 | E01/E02 | DONE | `auth.spec.ts` |
| FRONT-020 | M01, P01, M02 | DONE | `tasks.spec.ts` |
| FRONT-030 | Liste : recherche, filtres, tri, pagination, statut | DONE | `tasks.spec.ts` |
| FRONT-031 | Kanban DnD, sélecteur de statut, mobile horizontal, pagination par colonne | DONE | `kanban.spec.ts`, `mobile.spec.ts` |
| FRONT-040 | Dashboard | DONE | `tasks.spec.ts` (synchronisation) |
| FRONT-050 | Profil | DONE | `profile.spec.ts` |
| INT-001 | Client API (CSRF, refresh single-flight, erreurs) | DONE | `client.test.ts` |
| INT-002 | Routes publiques/privées, destination initiale, session expirée | DONE | `auth.spec.ts` |
| INT-003 | Invalidation croisée Liste/Kanban/Dashboard | DONE | `tasks.spec.ts`, `kanban.spec.ts` |
| TEST-001 | Parcours navigateur | DONE | 18 parcours Playwright |
| TEST-002 | Vérification visuelle | DONE (Chromium uniquement) | 36 captures clair/sombre × desktop/tablette/mobile |
| DOC-001 | README, `.env.example` | DONE | — |
| AUDIT-001 | Audit de conformité | DONE | `IMPLEMENTATION_TRACEABILITY.md` |

## Déploiement (1er novembre 2026)
- VPS `souven` (Ubuntu 26.04, Docker 29) : stack Compose `taskora` dans `~/apps/taskora`, réseau et volume dédiés, **aucun port publié**.
- Accès public via tunnel Cloudflare rapide (`*.trycloudflare.com`, adresse variable à chaque redémarrage du tunnel — voir README §14).
- Vérifié en HTTPS public : inscription, cookies `__Host-` Secure/HttpOnly, création/stats/suppression de tâche, refus d'une origine étrangère, déconnexion, Swagger désactivé, CSP par empreinte sans violation dans le navigateur. Applications existantes du VPS restées en service.
- Un compte de vérification `smoke-…@exemple.test` (sans tâche) a été créé en production par le test de fumée.

## Dernière exécution des tests (1er novembre 2026)
| Suite | Commande | Résultat |
|---|---|---|
| Backend unitaires + intégration | `cd backend && npm test` | 31/31 |
| Backend E2E API | `cd backend && npm run test:e2e` | 56/56 (stable sur 6 exécutions) |
| Backend lint + typecheck | `npm run lint && npm run typecheck` | OK |
| Frontend unitaires | `cd frontend && npm test` | 13/13 |
| Frontend Playwright | `cd frontend && npm run test:e2e` | 18/18 (+2 captures) |
| Frontend lint + typecheck + build | `npm run lint && npm run typecheck && npm run build` | OK |

## Défauts trouvés et corrigés pendant la recette
- Échecs intermittents des tests E2E (réponses non HTTP, statut 501 parasite) : supertest ouvrait un port éphémère par requête → application de test à l'écoute une seule fois.
- `npm run build` du frontend échouait (types DOM absents pour les tests Playwright) → corrigé, révélé par le build Docker.
- Tri alphabétique sensible aux accents → colonne `titleSort` normalisée (migration 2).
- Une migration Prisma générée supprimait les contraintes CHECK → réécrite en `ALTER TABLE ADD COLUMN`.
- Retour à la destination initiale court-circuité après connexion ; puis conservé à tort après déconnexion volontaire → corrigés.
- Réinitialisation des filtres écrasée par un changement de tri rapproché (navigations différées) → mises à jour partielles fusionnées.
- Drag-and-drop : colonne cible mal calculée → détection au pointeur + aperçu en portail.
- Logo et illustrations invisibles quand une copie masquée existait (identifiants SVG dupliqués) → identifiants uniques.

## Limites et vérifications non réalisées
- Recette exécutée sous Node 23.9 (non LTS) ; Node 22 LTS non testé.
- Navigateurs : Chromium uniquement (pas de Firefox/Safari). Zoom 200 % et lecteur d'écran réel non testés manuellement.
- Pas de glisser-déposer au clavier : l'alternative accessible exigée est le sélecteur de statut (testé).
- La base de développement `backend/prisma/data/dev.db` contient le compte de démonstration, un compte de test créé pendant la recette manuelle (`awa2@ex.com`) et une tâche « Tester le parcours complet ».

## Prochaines actions possibles
- Initialiser Git et committer (les migrations et lockfiles doivent être versionnés).
- Tester sous Node 22 LTS, Firefox et Safari ; audit lecteur d'écran.
- Préparer l'hébergement (reverse proxy TLS, volume persistant, sauvegardes hors hôte).
