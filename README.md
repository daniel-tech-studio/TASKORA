# TASKORA

Gestion **personnelle** de tâches : tableau de bord, Liste et Kanban synchronisés, profil, thèmes clair/sombre.
Spécifications : [`llm.md`](llm.md) (frontend) et [`backend.md`](backend.md) (backend).
Suivi : [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) · [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) · [`IMPLEMENTATION_TRACEABILITY.md`](IMPLEMENTATION_TRACEABILITY.md).

| Dossier | Stack |
|---|---|
| `backend/` | NestJS 11 · TypeScript strict · Prisma 6 · SQLite · Argon2id · JWT (cookies HttpOnly) · Swagger |
| `frontend/` | React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · TanStack Query · React Router 7 · dnd-kit · Lucide |

## Prérequis
- Node.js **22 LTS** recommandé (≥ 20.11). La recette a été exécutée avec Node 23.9.
- npm 10.

## Installation et premier lancement

```bash
cd backend && npm ci && cp .env.example .env
```

Générer deux secrets différents et les coller dans `backend/.env` (`JWT_ACCESS_SECRET`, `CSRF_SECRET`) :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```bash
cd backend && mkdir -p prisma/data && npm run db:deploy && npm run build
```

```bash
cd frontend && npm ci && cp .env.example .env.local
```

Démarrer (deux terminaux) :

```bash
cd backend && npm run start:prod
```

```bash
cd frontend && npm run dev
```

Application : http://localhost:5173 — API : http://localhost:3000/api/v1 — Swagger : http://localhost:3000/api/docs.
Si le port 3000 est occupé, changer `PORT` dans `backend/.env` et `API_PROXY_TARGET` dans `frontend/.env.local`.

Données de démonstration (facultatif, jamais automatique, refusé en production) :

```bash
cd backend && npm run db:seed
```

Compte fictif : `demo@taskora.test` / `taskora-demo-2026`.

## Topologie et sécurité
- Le frontend appelle `/api/v1` **sur sa propre origine** (proxy Vite en dev, reverse proxy en prod) : cookies `SameSite=Lax`, pas de CORS côté navigateur.
- Cookies HttpOnly `taskora_access` (JWT 15 min) et `taskora_refresh` (opaque, 7 jours glissants, rotation + détection de réutilisation). Avec `COOKIE_SECURE=true` (obligatoire en production) : préfixe `__Host-`, attribut `Secure`.
- Toutes les mutations (y compris login/register/refresh/logout) exigent `Origin` autorisé **et** `X-CSRF-Token` (HMAC lié au cookie CSRF et à la session, obtenu via `GET /auth/csrf`).
- Limitation : 120 req/min/IP ; login 5/15 min par IP+email ; inscription 3/h/IP ; refresh 30/10 min (variables `THROTTLE_*`). Stockage en mémoire : une seule instance.
- Erreurs normalisées `{code, message, details?, requestId}` ; journaux JSON expurgés (aucun mot de passe, jeton ni cookie).

## Scripts

| Backend | Rôle |
|---|---|
| `npm run dev` / `start:prod` | API en développement / compilée |
| `npm run lint` · `typecheck` | Qualité statique |
| `npm test` | Unitaires + intégration (SQLite de test migrée, supprimée ensuite) |
| `npm run test:e2e` | E2E API (T01–T24) |
| `npm run db:migrate` | Nouvelle migration (dev) |
| `npm run db:deploy` | Appliquer les migrations versionnées (livraison) |
| `npm run db:seed` | Données fictives, sur demande |
| `npm run db:backup [-- fichier]` | Instantané cohérent `VACUUM INTO` + `integrity_check` |
| `npm run db:restore-check -- fichier` | Test de restauration sur une copie séparée |

| Frontend | Rôle |
|---|---|
| `npm run dev` / `build` / `preview` | Développement / build / prévisualisation |
| `npm run lint` · `typecheck` | Qualité statique |
| `npm test` | Vitest (client API, formulaires, composants) |
| `npm run test:e2e` | Playwright : API réelle + Vite sur ports dédiés (3200/5273), base `e2e.db` recréée |
| `CAPTURE=1 npx playwright test e2e/screenshots.spec.ts --project=desktop` | Captures de recette → `docs/screenshots/` |

Playwright utilise Chromium 1248 (`npx playwright install chromium` si absent).

## Sauvegarde et restauration SQLite
1. `npm run db:backup` (fonctionne à chaud, WAL inclus) → `backend/backups/taskora-<date>.db`.
2. `npm run db:restore-check -- backups/<fichier>.db` vérifie intégrité, migrations et inventaire sur une copie temporaire.
3. Restauration réelle : arrêter l'API, copier la sauvegarde à l'emplacement de `DATABASE_URL`, supprimer les éventuels `-wal`/`-shm` de l'ancien fichier, `npm run db:deploy` (n'applique que les migrations manquantes), redémarrer.

## Mise en production (non réalisée)
1. Construire : `npm run build` dans `backend/` et `frontend/`.
2. Servir `frontend/dist` et proxifier `/api` vers l'API derrière un reverse proxy TLS (même site).
3. `NODE_ENV=production`, `COOKIE_SECURE=true`, `FRONTEND_ORIGIN=https://votre-domaine`, secrets générés hors Git, `TRUST_PROXY=true` derrière le proxy, `SWAGGER_ENABLED=false` (défaut en production).
4. `npm run db:deploy` avant chaque démarrage de nouvelle version ; volume persistant pour la base ; sauvegardes régulières hors hôte.
5. Une seule instance applicative (SQLite + limitation en mémoire).

## Dépannage
- `Configuration invalide` au démarrage : un secret manque, fait moins de 32 caractères ou les deux secrets sont identiques.
- `EADDRINUSE` : port occupé, changer `PORT`/`API_PROXY_TARGET`.
- 403 `CSRF_INVALID` en appelant l'API à la main : récupérer `GET /auth/csrf` avec les mêmes cookies et envoyer `Origin` + `X-CSRF-Token`.
- `database is locked` pendant une migration : arrêter l'API qui tient la base.
