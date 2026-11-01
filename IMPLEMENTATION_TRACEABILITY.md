# TASKORA — Matrice de traçabilité

Statuts : **V** implémenté et vérifié (test automatisé) · **VV** vérifié visuellement (captures) · **I** implémenté, non vérifié automatiquement · **B** bloqué.

## Frontend (`llm.md`)

| Exigence | Implémentation | Vérification | Statut |
|---|---|---|---|
| 1.2 Compte unique, email/mot de passe, session persistante | `lib/auth.tsx`, cookies HttpOnly | `auth.spec.ts` (reload) | V |
| 1.2 Pas de « mot de passe oublié » | `LoginPage.tsx` | `auth.spec.ts` (aucun lien) | V |
| 2.1 E01–E05, M01, P01, M02, S01 ; Kanban en onglet | `pages/*`, `components/tasks/*` | Playwright | V |
| 2.2 Routes `/connexion`, `/inscription`, `/tableau-de-bord`, `/taches?vue=`, `/profil` | `App.tsx` | `auth.spec.ts` | V |
| 2.2 Privé → connexion, connecté → dashboard, retour destination | `RequireAuth`, `PublicOnly`, `lib/navigation.ts` | `auth.spec.ts` | V |
| 2.3 Sidebar + topbar, actif identifiable hors couleur (marqueur) | `AppShell.tsx` | captures | VV |
| 2.4 Tablette : sidebar réduite en rail | `AppShell.tsx` | captures tablette | VV |
| 2.5 Bottom nav, cibles ≥ 44 px, zone de sécurité | `AppShell.tsx` (`safe-bottom`) | `mobile.spec.ts` | V |
| 3.2/3.3 Palette et tokens clair/sombre | `index.css` | captures | VV |
| 3.4 Sora / DM Sans, poids utiles, `swap` | `main.tsx` (@fontsource) | build | V |
| 3.6 Halos, glassmorphism localisé, illustrations | `AuthLayout`, `Illustrations.tsx`, bandeau dashboard | captures | VV |
| 3.7 Thème système initial, choix mémorisé, mode système réactif, anti-flash | `lib/theme.tsx`, script `index.html` | `profile.spec.ts` | V |
| 4.2 Button (variantes, chargement), champs à label persistant, `aria-invalid`, toggle mot de passe | `ui/Button.tsx`, `ui/Field.tsx` | `auth.spec.ts` | V |
| 4.2 Tabs clavier | `ui/Tabs.tsx` | `kanban.spec.ts` (flèches) | V |
| 4.2 FilterBar, indicateur, réinitialiser | `tasks/FilterBar.tsx` | `tasks.spec.ts` | V |
| 4.3 TaskCard, badges, échéance/retard | `TaskCard.tsx`, `TaskBadges.tsx` | `TaskBadges.test.tsx`, Playwright | V |
| 4.3 StatCard, progression + texte, répartition + légende + texte | `DashboardWidgets.tsx` | `tasks.spec.ts`, captures | V |
| 4.4 Modale : focus initial, piège, Échap, restitution | `ui/Overlay.tsx`, `CreateTaskModal.tsx` | `tasks.spec.ts` | V |
| 4.4 Drawer P01, M02 nominatif, focus sur Annuler | `TaskDetailDrawer.tsx`, `ConfirmDialog.tsx` | `tasks.spec.ts`, `ConfirmDialog.test.tsx` | V |
| 4.4 Toasts + aria-live, jamais seul canal d'erreur de formulaire | `lib/toast.tsx`, `InlineAlert` | Playwright | V |
| 4.5 Actions async : progression et anti-doublon | `Button loading`, gardes `isPending` | revue de code | I |
| E01 Validation locale, erreur générique, email conservé, Entrée soumet | `LoginPage.tsx` | `auth.spec.ts` | V |
| E02 Confirmation, email déjà utilisé, session ouverte | `RegisterPage.tsx` | `auth.spec.ts` | V |
| E03 Valeurs du service, 0 tâche, aucune priorité/aucun retard, listes → drawer | `DashboardPage.tsx` | `auth.spec.ts`, `tasks.spec.ts` | V |
| E04 Recherche/filtres/tri combinés, zéro tâche ≠ zéro résultat, terminées visibles | `TasksPage.tsx` | `tasks.spec.ts` | V |
| E04 Statut modifiable depuis la carte | `StatusSelect.tsx` | `tasks.spec.ts` | V |
| V01 DnD souris, retour visuel, rollback en cas d'échec | `KanbanBoard.tsx` | `kanban.spec.ts` | V |
| V01 Mobile : défilement horizontal, pas de DnD tactile, menu de statut | `KanbanBoard.tsx` (MouseSensor seul) | `mobile.spec.ts` | V |
| V01 Annonce textuelle du déplacement | `toast.announce` | `kanban.spec.ts` | V |
| E05 Infos, email avec mot de passe actuel, mot de passe, déconnexion, avatar initiales | `ProfilePage.tsx` | `profile.spec.ts` | V |
| M01 Champs, défaut À faire, échéance facultative, abandon protégé | `CreateTaskModal.tsx` | `tasks.spec.ts` | V |
| P01 Tâche supprimée/inaccessible → fermeture | `TaskDetailDrawer.tsx` (404) | revue de code | I |
| S01 Session expirée → connexion sans données privées | `lib/auth.tsx` (`queryClient.clear`) | `auth.spec.ts` | V |
| 6.2 Dates civiles locales sans décalage | `lib/dates.ts` | `dates.test.ts` | V |
| 6.3 Aucun secret en stockage JS | client `credentials: include` | `auth.spec.ts` (document.cookie, localStorage) | V |
| 7 Aucun défilement horizontal de page | layout | `mobile.spec.ts` | V |
| 8 prefers-reduced-motion | `index.css` | captures en `reducedMotion: reduce` | I |
| 9 Zoom 200 %, lecteur d'écran | — | non testé | I |

## Backend (`backend.md`)

| Exigence | Implémentation | Vérification | Statut |
|---|---|---|---|
| A4 NestJS · Prisma · SQLite · `/api/v1` | `backend/src` | E2E | V |
| B1 Modules Auth/Users/Tasks/Prisma/Common/Config ; stats dans TasksModule | `app.module.ts` | E2E | V |
| C1 User/Session/RefreshTokenHistory/Task | `prisma/schema.prisma` | `ops.spec.ts` | V |
| C2 Email unique, index, suppression physique, migrations versionnées | migrations | T02, T21 | V |
| C3 Transitions libres, `completedAt` | `tasks.service.ts` | T13 | V |
| C4 Retard calculé par fuseau, horloge injectable, frontières | `civil-date.ts`, `Clock` | T14, T15, tests frontières | V |
| C5 Rotation atomique, mises à jour filtrées id+owner | `session.service.ts`, `tasks.service.ts` | T05, T06, T10 | V |
| D2 Endpoints auth, cookies, inscription → session | `auth.controller.ts` | T01, T05, T07 | V |
| D3 Profil, `currentPassword` pour email/mot de passe, 409 | `users.service.ts` | T20 | V |
| D4 CRUD, `/tasks/stats` avant `/:id`, PATCH partiel, corps vide refusé | `tasks.controller.ts` | `tasks.e2e-spec.ts` | V |
| D5 Pagination, recherche, filtres, tri stable, nulls en fin | `tasks.service.ts` | T16 | V |
| D6 Kanban : 3 appels paginés indépendants | `useKanbanColumn` | T17 | V |
| D7 Stats globales exactes | `tasks.service.ts` | T19 | V |
| D8 Erreurs normalisées, pas de stack | `all-exceptions.filter.ts` | `security.e2e-spec.ts` | V |
| E1 Argon2id, secrets validés, `alg=none` refusé | `password.service.ts`, `token.service.ts` | test JWT falsifié | V |
| E2 CSRF signé + Origin, CORS explicite | `csrf.guard.ts`, `setup-app.ts` | T09, test CORS | V |
| E3 404 indistinct | services | T10 | V |
| E4 DTO stricts, limite JSON, throttling | `validation.ts`, `throttler.guard.ts` | T04, T12, 413 | V |
| E5 Journaux expurgés, requestId | `app-logger.ts`, middleware | T24 | V |
| F3 `migrate deploy`, CHECK SQL | migrations | `ops.spec.ts` | V |
| F4 Seed explicite, refusé en production | `prisma/seed.ts` | T23 | V |
| F5 WAL, foreign_keys, backup cohérent, restauration testée | `prisma.service.ts`, `scripts/` | T22 | V |
| F6 Scripts, README, Swagger `/api/docs` | `package.json`, README | test Swagger | V |
| A3 Aucune fonctionnalité exclue | — | test Swagger (pas de reset/admin) | V |
| Docker | — | facultatif, non fourni | — |
