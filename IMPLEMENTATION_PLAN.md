# TASKORA — Plan d'implémentation

## Objectif global (GOAL)
Implémenter intégralement l'application décrite dans `llm.md` (frontend) et `backend.md` (backend) :
une application full-stack de gestion **personnelle** de tâches, opérationnelle, sécurisée et testée,
sans fonctionnalité hors V1.

## État initial (1er novembre 2026)
- Dépôt non versionné contenant uniquement `llm.md` et `backend.md`. Aucun code existant.
- Outils disponibles : Node 23.9 (non-LTS ; Node 22 LTS recommandé dans le README), npm 10.9, sqlite3 3.51, navigateur Chromium Playwright en cache.

## Stack retenue
| Couche | Choix | Source |
|---|---|---|
| Backend | NestJS 11 · TypeScript strict · Prisma 6 · SQLite fichier | backend.md A4 (validé) |
| Hash | Argon2id (`argon2`) | backend.md E1 |
| Auth | JWT access 15 min (HS256) + refresh opaque 7 j, cookies HttpOnly, rotation + historique | B01/B06 |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · lucide-react | llm.md 10.1 (validé) |
| Données front | TanStack Query (libre, llm.md 10.1) · React Router 7 · @dnd-kit (drag-and-drop) | conventions |
| Tests | Jest + supertest (unit, intégration SQLite réelle, E2E API) · Vitest (front) · Playwright (parcours navigateur) | G1 |

## Contradictions / arbitrages relevés
| # | Sujet | Résolution |
|---|---|---|
| C1 | llm.md « six écrans » vs inventaire de 5 pages | 5 pages + Kanban en onglet (llm.md 2.1 tranche déjà) |
| C2 | Comportement post-inscription (llm.md : à confirmer) | backend.md D2 : session ouverte immédiatement → redirection Dashboard |
| C3 | Changement d'email sans mot de passe actuel ? | backend.md D3 : `currentPassword` requis → champ affiché dans la carte « Informations personnelles » uniquement quand l'email change |
| C4 | Fuseau horaire sans écran dédié | Fuseau navigateur transmis à l'inscription (`timeZone`), fallback UTC ; aucun contrôle UI ajouté |
| C5 | Topologie cookies/CORS | Dev : proxy Vite `/api` → API (same-origin, SameSite=Lax, cookies sans `__Host-` en HTTP). Prod : `COOKIE_SECURE=true` → préfixe `__Host-`, `Secure` |
| C6 | Listes « prioritaires » / « en retard » du Dashboard | `GET /tasks` filtré (D7), stats via `GET /tasks/stats` |
| C7 | Enums SQLite | Chaînes validées DTO/service + contraintes `CHECK` SQL dans la migration |

## Phases et tâches

Statuts : TODO · IN_PROGRESS · BLOCKED · DONE (DONE = implémenté **et** vérifié). L'état réel est suivi dans `IMPLEMENTATION_STATUS.md`.

### Phase A — Fondations
| ID | Tâche | Dépendances | Fichiers | Validation |
|---|---|---|---|---|
| FOUND-001 | Squelette monorepo (`backend/`, `frontend/`), `.gitignore`, scripts racine | — | racine | install OK |
| BACK-001 | NestJS strict, ConfigModule validé (Joi-like maison), PrismaModule | FOUND-001 | `backend/src/config`, `prisma` | démarrage refuse config invalide |
| BACK-002 | Schéma Prisma User/Session/RefreshTokenHistory/Task + migration initiale + CHECK | BACK-001 | `backend/prisma` | `migrate deploy` sur base vierge |
| BACK-003 | Common : ValidationPipe strict, filtre d'erreurs normalisé, requestId, logs expurgés, helmet, CORS | BACK-001 | `backend/src/common` | tests E2E erreurs |

### Phase B — Cœur métier
| ID | Tâche | Dépendances | Validation |
|---|---|---|---|
| BACK-010 | Auth : register/login/me/logout, Argon2id, cookies | BACK-002/003 | T01–T03, T07, T08 |
| BACK-011 | Refresh rotatif atomique, historique, détection de réutilisation, fenêtre de concurrence | BACK-010 | T05, T06 |
| BACK-012 | CSRF signé (HMAC lié au cookie CSRF + session) + contrôle Origin | BACK-010 | T09 |
| BACK-013 | Throttling global + login/register/refresh | BACK-010 | T04 |
| BACK-020 | Users : GET/PATCH me, PATCH password (révocation autres sessions) | BACK-010 | T20 |
| BACK-030 | Tasks CRUD, propriété, completedAt, dueDate civile | BACK-010 | T10–T13, T21 |
| BACK-031 | Liste paginée, recherche, filtres, tri stable, Kanban par colonne | BACK-030 | T16–T18 |
| BACK-032 | Stats + retard par fuseau (horloge injectable) | BACK-030 | T14, T15, T19 |
| BACK-040 | Swagger `/api/docs`, seed explicite, backup/restore-check | BACK-030 | T22, T23 |
| BACK-041 | Tests logs sans secrets | BACK-003 | T24 |

### Phase C — Interfaces
| ID | Tâche | Validation |
|---|---|---|
| FRONT-001 | Vite/React/TS/Tailwind, tokens clair/sombre, polices Sora/DM Sans, anti-flash thème | rendu 2 thèmes |
| FRONT-002 | Composants UI (Button, champs, Tabs, Select, Toast, Dialog, Drawer, Skeleton, EmptyState, illustrations) | tests composants |
| FRONT-003 | AppShell : Sidebar, Topbar, BottomNav, ThemeSwitcher, UserMenu | navigation clavier/mobile |
| FRONT-010 | E01 Connexion · E02 Inscription | parcours auth |
| FRONT-020 | M01 Nouvelle tâche · P01 Drawer · M02 Suppression | CRUD |
| FRONT-030 | E04 Liste : recherche, filtres, tri, pagination, statut inline | filtres/tri |
| FRONT-031 | V01 Kanban : DnD desktop, menu de statut, scroll horizontal mobile, pagination par colonne | DnD + clavier |
| FRONT-040 | E03 Dashboard : stats, progression, répartition, prioritaires, retard | cohérence chiffres |
| FRONT-050 | E05 Profil : infos, sécurité, déconnexion, avatar initiales | modifs profil |

### Phase D — Intégration
| ID | Tâche | Validation |
|---|---|---|
| INT-001 | Client API typé : cookies, CSRF bootstrap, refresh single-flight, erreurs normalisées | tests Vitest |
| INT-002 | Routes publiques/privées, retour destination, session expirée | Playwright |
| INT-003 | Invalidation croisée Liste/Kanban/Dashboard après mutation | Playwright |

### Phase E — Finalisation
| ID | Tâche | Validation |
|---|---|---|
| TEST-001 | Parcours E2E navigateur (auth, CRUD, Kanban, profil, thème) | Playwright vert |
| TEST-002 | Vérification visuelle desktop/tablette/mobile, clair/sombre | captures |
| DOC-001 | README (démarrage, secrets, migrations, tests, backup, prod) + `.env.example` | relecture |
| AUDIT-001 | Audit final de conformité + rapport | `IMPLEMENTATION_TRACEABILITY.md` |

## Risques
- Node 23 non-LTS : compatibilité binaire `argon2`/Prisma à vérifier (fallback : Node 22 documenté).
- Throttling vs tests : seuils configurables par variables d'environnement (valeurs par défaut = seuils proposés).
- Concurrence de refresh multi-onglets : fenêtre de grâce courte sans révocation (backend.md H7).
