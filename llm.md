# TASKORA — LLM.MD
## Spécifications de conception et d'implémentation FRONTEND

**Version :** 1.0 — cadrage D01 à D08 validé  
**Statut :** référence produit frontend  
**Périmètre :** application web responsive, React + TypeScript + Tailwind CSS  
**Hors document :** architecture backend NestJS, schéma Prisma, base SQLite, implémentation serveur, déploiement backend.

> **Directive fondamentale pour toute IA de design ou de développement :** ce document est la source de vérité du **frontend** TASKORA. Respecter le périmètre et les décisions validées. Ne pas inventer de modules, de rôles, de fonctionnalités, de données métier ou de pages supplémentaires. Les prescriptions détaillées ci-dessous qui n'ont pas fait l'objet d'un arbitrage explicite sont identifiées comme **conventions d'implémentation proposées** : elles rendent l'interface réalisable sans prétendre être de nouvelles décisions métier.

---

# 01. Vision produit et périmètre

## 1.1. Proposition de valeur
TASKORA est un outil de gestion **personnelle** de tâches, orienté clarté, organisation et sérénité. L'utilisateur peut enregistrer, retrouver, prioriser, suivre et terminer ses tâches, dans une interface moderne, expressive et accessible. Le produit est également un projet pédagogique réalisable de façon accélérée avec l'assistance d'une IA de développement.

## 1.2. Utilisateur et permissions
- Un seul type de compte : utilisateur personnel.
- Authentification par email et mot de passe.
- Session persistante ; l'utilisateur reste connecté après actualisation.
- Chaque utilisateur ne voit et ne gère **que ses propres tâches**.
- Profil modifiable : nom, email, mot de passe.
- Récupération de mot de passe **hors V1**. Ne pas présenter un bouton « mot de passe oublié » qui mène à une impasse. Si la maquette le montre, le retirer.
- Aucun rôle administrateur, aucune équipe, aucun partage de tâche, aucune invitation.

## 1.3. Fonctionnalités V1 validées
1. Inscription, connexion et déconnexion.
2. Tableau de bord : compteurs, progression, répartition par statut, tâches prioritaires, tâches en retard.
3. Création, consultation, modification et suppression de tâches.
4. Trois statuts : **À faire**, **En cours**, **Terminée**.
5. Trois priorités : **Basse**, **Moyenne**, **Haute**.
6. Échéance **facultative** ; indication claire du retard pour les tâches non terminées.
7. Une page **Mes tâches** avec onglets **Liste** et **Kanban**.
8. Vue Liste sous forme de **cartes structurées** ; recherche, filtres, tri.
9. Vue Kanban avec trois colonnes et drag-and-drop qui met à jour le statut.
10. Conservation des tâches terminées dans l'historique ; elles ne disparaissent pas automatiquement.
11. Profil utilisateur : informations personnelles et sécurité.
12. Mode clair **et** sombre ; préférence initiale selon le système, puis choix manuel mémorisé.
13. Responsive desktop, tablette, mobile ; Kanban mobile à défilement horizontal avec alternative accessible de changement de statut.

## 1.4. Exclusions fermes
Ne pas ajouter de projets, catégories personnalisées, sous-tâches, récurrences, notifications push, rappels automatiques, commentaires, mentions, pièces jointes, calendrier externe, collaboration, facturation, paiement, IA, dashboard d'administration, récupération de compte, social login ni intégrations tierces.

## 1.5. Critères de succès
- Tous les parcours principaux fonctionnent sans données simulées figées dans la version livrée.
- Une modification de tâche se reflète dans Liste, Kanban et Dashboard.
- Le visuel est soigné en clair et en sombre, pas seulement fonctionnel.
- Les interactions restent accessibles au clavier et en mobile.
- Aucun contrôle sans comportement réel ; aucun faux succès.

---

# 02. Architecture de l'information et navigation

## 2.1. Écrans et composants contextuels — inventaire canonique

| Code | Interface | Nature | Accès |
|---|---|---|---|
| E01 | Connexion | page | publique |
| E02 | Inscription | page | publique |
| E03 | Tableau de bord | page | privé |
| E04 | Mes tâches | page, onglet Liste ou Kanban | privé |
| E05 | Mon profil | page | privé |
| M01 | Nouvelle tâche | modale | depuis Dashboard ou Mes tâches |
| P01 | Détails / modification de tâche | drawer latéral desktop ; surface adaptée sur mobile | depuis Liste, Kanban, Dashboard |
| M02 | Confirmer la suppression | dialogue de confirmation | depuis P01 / action supprimer |
| S01 | États système | ensemble d'états / notifications, pas une page dédiée | transversal |

**Note de cohérence :** la décision 07 évoquait « six écrans », mais son inventaire nommait effectivement cinq pages (E01 à E05) plus une vue Kanban dans E04. Ne **pas** créer artificiellement une sixième page. Le Kanban est une variante de Mes tâches, non une route indépendante obligatoire.

## 2.2. Routes frontend suggérées (convention technique)
- `/connexion` → E01
- `/inscription` → E02
- `/` ou `/tableau-de-bord` → E03
- `/taches` → E04 ; choix Liste/Kanban synchronisé à un paramètre d'URL facultatif (`?vue=liste|kanban`).
- `/profil` → E05

Prévoir un routage cohérent avec routes publiques et privées. Visiteur sur route privée → connexion ; utilisateur connecté sur écran d'authentification → tableau de bord. Retour à la destination initiale après connexion si techniquement simple, sans complexifier le produit.

## 2.3. Navigation desktop
- **Sidebar latérale** persistante : logo TASKORA, Tableau de bord, Mes tâches, Mon profil.
- **Topbar** : titre/contextualisation, bouton « Nouvelle tâche » quand pertinent, bascule de thème, accès au profil/déconnexion via contrôle explicite.
- Une seule navigation principale pour Mes tâches ; Liste/Kanban sont des onglets **internes**.
- L'item actif doit être reconnaissable par plus que la couleur (fond, typographie, marqueur ou forme).

## 2.4. Navigation tablette
- Conserver la logique de navigation ; sidebar réduite ou adaptée selon largeur disponible (**convention d'implémentation**).
- La zone centrale doit rester lisible sans défilement horizontal global.

## 2.5. Navigation mobile
- **Barre inférieure** : Tableau de bord, Mes tâches, Profil.
- Libellés visibles avec icônes ; zone tactile d'au moins 44 × 44 px.
- Topbar compacte avec titre, bouton de création accessible, commande de thème à un emplacement cohérent.
- Marges suffisantes au-dessus de la barre inférieure, y compris zones de sécurité de l'appareil.

---

# 03. Direction artistique validée

## 3.1. Personnalité
**Soft Productivity** : confort visuel, optimisme discret, lisibilité élevée et sensation de maîtrise. Contrairement à un « minimalisme vide », l'application a une présence graphique réelle : compositions de fond, lumière, profondeur, hiérarchie, illustrations et motion design. Éviter néanmoins un aspect gadget, des gradients envahissants ou des animations gênant le travail.

## 3.2. Palette officielle — base validée
| Rôle | Hex | Utilisation |
|---|---|---|
| Primary Violet | `#6757E8` | CTA, focus, sélection, repères interactifs |
| Lavender | `#A99CF4` | accents, variations du violet, halos |
| Deep Navy | `#1C2440` | titres, surfaces sombres, profondeur |
| Off White | `#F7F8FC` | fond de page mode clair |
| White | `#FFFFFF` | cartes et panneaux mode clair |

## 3.3. Tokens sémantiques proposés (détails non validés individuellement)
Les couleurs ci-dessous sont des **conventions de production ajustables après test de contraste**. Ne pas les traiter comme de nouvelles décisions produit.

| Token | Clair | Sombre |
|---|---|---|
| `--bg-app` | `#F7F8FC` | `#111426` |
| `--bg-surface` | `#FFFFFF` | `#1C2440` |
| `--bg-elevated` | `#FFFFFF` | `#252D4B` |
| `--text-primary` | `#1C2440` | `#F5F6FF` |
| `--text-secondary` | `#626E86` | `#B7BED5` |
| `--border-default` | `#E6E8F2` | `#39425E` |
| `--primary` | `#6757E8` | `#A99CF4` |
| `--primary-on` | `#FFFFFF` | `#17152B` |
| `--primary-soft` | `#EEEBFF` | `#342E59` |
| `--focus-ring` | `#6757E8` | `#C7BCFF` |
| `--success` | `#178764` | `#4DD5A4` |
| `--warning` | `#A86E13` | `#F4C46B` |
| `--danger` | `#C53F55` | `#FF8795` |
| `--info` | `#2F6DCF` | `#86B8FF` |

Priorité basse : teinte neutre/bleu discret ; moyenne : ambre ; haute : rouge/rose. Statuts : À faire neutre/bleuté, En cours violet/bleu, Terminée vert. Toujours accompagner la couleur d'un libellé lisible.

## 3.4. Typographies
- **Sora** pour titres, grandes valeurs et identité.
- **DM Sans** pour paragraphes, champs, navigation, tableaux et boutons.
- Import optimisé (subset, `font-display: swap`, poids utiles uniquement).

**Échelle conseillée :** titre de page 28–32 px desktop / 23–26 mobile ; sections 18–22 ; intitulés de cartes 15–17 ; corps 14–16 ; libellés 12–14. Ligne de corps ~1,5 ; titres ~1,2–1,3. Ne pas descendre sous 12 px pour l'information fonctionnelle, sauf exception motivée.

## 3.5. Grilles, espaces, formes
- Grille d'espacement 4 px avec rythme dominant 8 / 12 / 16 / 24 / 32.
- Contenu avec largeur contrôlée sur grands écrans ; éviter une diffusion extrême des cartes.
- Rayons validés dans l'esprit : **12 à 20 px** pour cartes et panneaux. Suggestion : champs 12, boutons 12, cartes 16, grande modale 20, badges capsule.
- Cartes aérées et padding de 16 à 24 px ; densité légèrement adaptée au mobile.
- Ombres multi-couches très douces ; profondeur par contraste, bordure, ombre et lumière, pas par ombre lourde seule.

## 3.6. Arrière-plans et décor
- Halos radiaux violet/lavande, relief lumineux et formes abstraites légères sur zones de bienvenue et authentification.
- Glassmorphism **localisé** : panneaux décoratifs ou cartes d'accueil ; conserver des surfaces opaques derrière formulaires et données critiques pour la lisibilité.
- Illustrations **visibles**, mais significatives : écran auth, état « aucune tâche », état « aucune recherche », encouragement sur Dashboard.
- Ne pas surcharger toutes les cartes d'effets ; réserver l'expressivité aux moments clés.

## 3.7. Thème clair / sombre
- Au premier affichage, suivre `prefers-color-scheme` du système.
- Après changement manuel, mémoriser la préférence locale ; l'utilisateur peut sélectionner clair / sombre / système (**modèle d'interface proposé pour satisfaire la décision**).
- En mode système, réagir aux changements de préférence OS.
- Aucune inversion naïve : surfaces, contours, badges, illustrations, halos et ombres adaptés.
- Prévenir le flash de mauvais thème au chargement si possible.

## 3.8. Icônes et illustrations
- Icônes **Lucide** cohérentes, 18–22 px pour la navigation et actions usuelles.
- Illustrations vectorielles personnelles/abstraites dans les tons de marque ; prévoir variantes lisibles en mode sombre.
- Éviter que les illustrations n'obscurcissent les formulaires ou ne rivalisent avec les CTA.

---

# 04. Bibliothèque de composants frontend

Pour chaque composant, prévoir les variantes **clair/sombre**, les états utiles et les adaptations mobiles.

## 4.1. Structure de l'application
- `AppShell` : sidebar/topbar desktop, navigation inférieure mobile, surface centrale et overlays.
- `SidebarNav`, `Topbar`, `BottomNav` : état actif, focus clavier, accessibilité.
- `PageHeader` : titre, court texte d'accompagnement, action primaire.
- `ThemeSwitcher` : choix clair/sombre/système, mémorisé.
- `UserMenu` : accès profil, déconnexion.

## 4.2. Actions et saisie
- `Button` : primary dégradé expressif, secondary, ghost, destructive, icon ; tailles ; chargement, disabled, focus, hover, pressed.
- `TextField`, `EmailField`, `PasswordField` : labels **persistants**, placeholder d'aide seulement, aide et erreur près du champ, `aria-invalid`, toggle visibilité mot de passe.
- `TextArea`, `DateInput`, `Select`, `SearchField` ; contraintes et retour de validation visibles.
- `Tabs` : Liste / Kanban, actif, focus, navigation clavier.
- `FilterBar`, `FilterChip`, `SortSelect` : indicateur des filtres appliqués et action réinitialiser.

## 4.3. Tâches et statistiques
- `TaskCard` : titre, description tronquée si disponible, badge de priorité, statut, échéance, indicateur de retard, action ouvrir et actions utiles.
- `TaskStatusBadge`, `TaskPriorityBadge`, `DueDateLabel`.
- `KanbanColumn`, `KanbanTaskCard` : états drag actif / survol de zone / dépôt / indisponible ; contrôle alternatif pour changer le statut.
- `StatCard` : libellé, valeur réelle, icône, éventuel contexte.
- `ProgressIndicator` : taux de progression + texte équivalent.
- `StatusDistributionChart` : répartition par statut avec légende et équivalent textuel. Employer une représentation simple ; pas de graphique fictif ou constamment chargé.
- `PriorityTasksList`, `OverdueTasksList`.

## 4.4. Surfaces contextuelles
- `CreateTaskModal` : formulaire complet, overlay, fermeture explicite, gestion du focus, retour au déclencheur.
- `TaskDetailDrawer` : détails et édition, focus géré, fermeture claire, comportement mobile adapté.
- `DeleteConfirmDialog` : contexte nominatif, Annuler / Supprimer, suppression non déclenchée par défaut.
- `Toast/Alert` : succès, erreur et information ; jamais seul canal pour une erreur de formulaire.
- `EmptyState`, `LoadingSkeleton`, `ErrorState` : messages, illustrations adaptées et actions de reprise.

## 4.5. Contrats d'interaction
- Tout bouton visible a une action réellement implémentée.
- Ne pas rendre cliquable une carte entière **et** y imbriquer des boutons sans gestion des interactions clavier et propagation.
- Dialogues : `Escape` ferme si cela ne détruit pas une action non sauvegardée sans avertissement approprié ; focus piégé dans les modales ; focus restauré après fermeture.
- Les composants destructifs demandent confirmation ; les erreurs sont lisibles et actionnables.
- Une action asynchrone doit présenter un état de progression et empêcher les doublons.

---

# 05. Spécifications détaillées écran par écran

## E01 — Connexion
**Objectif :** accéder à son espace personnel. **Public :** visiteur non connecté.

### Composition
- Mise en page d'authentification distincte de l'AppShell privé : zone branding/illustration et zone formulaire sur desktop ; formulaire prioritaire avec décor atténué sur mobile.
- Logo TASKORA ; accroche courte ; illustration de productivité et halos de marque.
- Carte formulaire à fort contraste, titre « Bon retour sur TASKORA », sous-titre « Connectez-vous pour retrouver vos tâches. »
- Champs : « Adresse e-mail » (placeholder `vous@exemple.com`) ; « Mot de passe » (placeholder `Votre mot de passe`) et contrôle afficher/masquer.
- CTA principal « Se connecter » ; lien « Créer un compte ».
- **Pas de lien de réinitialisation**, fonctionnalité hors V1.

### Comportements
- Validation locale : champs obligatoires, forme d'email valide ; affichage contextualisé d'erreurs.
- Soumission → état « Connexion… », prévention double clic, retour d'erreur sans perte de l'email saisi.
- Succès → tableau de bord ou destination initiale ; session persistante.
- Éviter d'exposer des détails internes en cas d'identifiants invalides ; message simple « Adresse e-mail ou mot de passe incorrect. » si la réponse métier le permet.
- Entrée au clavier soumet le formulaire ; le contrôle visibilité n'altère pas la valeur.

### États
Initial, saisie, champ invalide, tentative en cours, erreur d'authentification, indisponibilité réseau, succès/redirection. Conserver un rendu accessible dans les deux thèmes.

## E02 — Inscription
**Objectif :** créer un compte personnel. **Public :** visiteur non connecté.

### Composition
- Même famille graphique que E01, variante d'illustration/accroche.
- Titre « Créez votre espace TASKORA », sous-titre « Organisez vos tâches à votre rythme. »
- Champs : « Nom complet », « Adresse e-mail », « Mot de passe » ; **convention UX proposée :** « Confirmer le mot de passe » pour diminuer les erreurs de saisie.
- CTA « Créer mon compte » ; lien « Déjà un compte ? Se connecter ».
- Indications de longueur/contraintes du mot de passe selon règles réellement appliquées ; ne pas promettre une règle divergente du service.

### Comportements et états
- Validation et erreurs inline ; confirmation identique au mot de passe si champ présent ; email déjà utilisé → message clair.
- Enregistrement en cours → loader et blocage du double envoi.
- Succès : suivre le comportement d'authentification effectivement pris en charge (connexion immédiate **ou** redirection vers E01 avec confirmation). **Point d'intégration à confirmer**, ne pas inventer un auto-login.
- Pas de vérification email ajoutée sans validation produit.

## E03 — Tableau de bord
**Objectif :** comprendre rapidement l'état de ses tâches et lancer les actions utiles. **Public :** utilisateur connecté.

### Hiérarchie visuelle
1. Header : « Tableau de bord » ; message d'accueil « Bonjour, {prénom} 👋 » (ou nom complet si nécessaire), CTA « Nouvelle tâche ».
2. Bandeau d'accueil expressif : décor radial/illustration discrète, message « Gardez le cap sur vos priorités. »
3. Rangée de statistiques : Total, À faire, En cours, Terminées, En retard (placement responsive sans surcharge).
4. Module « Progression globale » avec pourcentage réel et texte « {n} sur {total} tâches terminées ».
5. Module « Répartition des tâches » : graphique par statut et légende des trois catégories.
6. Bloc « Tâches prioritaires » : tâches non terminées de priorité Haute ; ouverture du drawer.
7. Bloc « En retard » : tâches non terminées dont échéance passée ; ouverture du drawer.

### Règles de rendu
- Aucun chiffre codé en dur : valeurs issues des données réelles / indicateurs renvoyés par le service.
- Si total = 0, afficher progression « 0 % » ou une indication « Pas encore de tâches » sans division par zéro, avec CTA « Créer ma première tâche ».
- Une tâche haute priorité et en retard peut figurer dans les deux blocs : ce n'est pas une erreur.
- Si aucun retard : état positif « Aucune tâche en retard » ; si aucune priorité haute : état adapté.
- Éviter un graphique spectaculaire mais inutilisable : un graphique simple, lisible, une légende et une restitution textuelle suffisent.

### Interactions
- CTA ouvre M01 ; sélection d'une tâche ouvre P01 ; section « Voir toutes mes tâches » dirige vers E04.
- Rafraîchir les données lorsque création, modification, suppression ou statut évolue.
- Squelettes de chargement proportionnés aux vrais modules ; erreur avec « Réessayer ».

## E04 — Mes tâches (vue Liste)
**Objectif :** gérer et parcourir toutes ses tâches. **Public :** connecté.

### Composition
- Header « Mes tâches » ; sous-titre « Retrouvez et organisez tout ce que vous avez à faire. » ; CTA « Nouvelle tâche ».
- Onglets : **Liste** et **Kanban**, sans changer de destination principale.
- Barre d'outils : champ « Rechercher une tâche… », filtres Statut / Priorité / Échéance (pour échéance : par exemple Avec échéance / Sans échéance / En retard, convention UX), tri (date de création, échéance, priorité — convention UI), réinitialisation des filtres.
- Grille/liste de cartes structurées selon largeur ; ne pas transformer en tableau compact.
- Carte : titre, résumé facultatif, statut, priorité, date si fournie, retard explicite, action ouvrir détail.

### Comportements
- Recherche textuelle, filtres et tri interopérables ; afficher la quantité de résultats si utile.
- L'utilisateur peut modifier le statut depuis l'interface via un contrôle accessible ; toutes les mutations actualisent les vues.
- Les tâches terminées demeurent consultables ; ne pas les supprimer/masquer systématiquement.
- Une échéance passée n'est un retard **que si la tâche n'est pas terminée**.
- État zéro tâche global distinct de zéro résultat après filtres.
- Les interactions de filtrage ne doivent pas déclencher un effacement des tâches.

### États
Chargement, aucune tâche, aucune correspondance, liste chargée, erreur de chargement, action en cours, erreur après mutation, succès avec feedback.

## V01 — Kanban (onglet de E04)
**Objectif :** organiser visuellement les tâches par état.

### Composition
- Même header et barre de contrôle de E04 ; onglet Kanban actif.
- Colonnes : **À faire**, **En cours**, **Terminée** ; en-tête et compteur, zone de dépôt identifiable.
- Cartes compactes mais lisibles : titre, priorité, échéance/retard, éventuellement extrait de description.
- Arrière-plan des colonnes distinct mais discret ; animation légère des cartes en déplacement.

### Comportements desktop
- Drag-and-drop d'une carte d'une colonne à l'autre = demande de mise à jour du statut ; retour visuel lors de la tentative.
- Mise à jour confirmée → carte dans sa nouvelle colonne, compteurs synchronisés ; si échec → état précédent restauré ou message explicite et état cohérent.
- Ouverture de P01 au clic/action dédiée (ne pas confondre clic avec drag).
- Contrôle alternatif de statut sur chaque carte, utilisable au clavier.

### Comportements mobile
- **Colonnes défilantes horizontalement** avec indication claire qu'on peut naviguer latéralement.
- Aucun drag-and-drop imposé au tactile : menu de changement de statut accessible et entièrement fonctionnel.
- Prévenir les conflits entre swipe de colonnes, scroll de page et action sur une carte.

### Accessibilité
- Ne jamais rendre le drag indispensable ; la même action est possible au clavier via contrôle de statut.
- Signaler la réussite/erreur du déplacement par un retour textuel accessible.

## E05 — Mon profil
**Objectif :** consulter/modifier ses coordonnées et sécuriser son compte.

### Composition
- Header « Mon profil », sous-titre « Gérez vos informations personnelles et votre sécurité. »
- Carte « Informations personnelles » : nom, email ; bouton « Enregistrer les modifications ».
- Carte « Sécurité » : champ mot de passe actuel si requis par le service, nouveau mot de passe, confirmation (convention UX) ; bouton « Modifier le mot de passe ».
- Section/session : action « Se déconnecter » clairement identifiable.
- Avatar : afficher initiales élégantes dans un disque, **sans introduire un upload photo non validé**.

### Comportements
- Préremplir uniquement les champs non sensibles connus ; ne jamais préremplir le mot de passe.
- Conserver les champs lors d'une erreur de validation non sensible ; effacer les données de mot de passe après succès.
- Si l'email est modifié, l'application rafraîchit l'identité affichée en navigation.
- Erreurs et succès visibles par section ; aucune modification réelle ne doit être annoncée avant confirmation.

## M01 — Modale « Nouvelle tâche »
**Objectif :** créer rapidement une tâche avec son formulaire complet.

### Champs
- « Titre de la tâche » — requis, placeholder « Ex. Préparer la présentation ».
- « Description » — facultatif, placeholder « Ajoutez quelques détails utiles… ».
- « Priorité » — choix Basse / Moyenne / Haute.
- « Statut » — choix À faire / En cours / Terminée (**convention de formulaire alignée sur les statuts validés** ; valeur initiale recommandée À faire).
- « Date d'échéance » — facultative ; aucune date imposée.
- Actions « Annuler » et « Créer la tâche ».

### Interactions et états
- Validation avant envoi ; erreur attachée au champ ; fermeture via Annuler/fermer, gestion du focus.
- Si l'utilisateur a modifié des champs, éviter les pertes involontaires (confirmation légère si nécessaire, convention UX).
- Loading sur bouton, protection contre double soumission.
- Succès : fermeture, notification « Tâche créée », rafraîchissement Liste/Kanban/Dashboard.
- Échec : formulaire conservé et message explicite ; pas de fermeture trompeuse.
- Mobile : surface verticale à hauteur adaptée, scroll interne contrôlé et boutons accessibles.

## P01 — Drawer « Détails de la tâche »
**Objectif :** voir et modifier la tâche sans quitter sa page.

### Contenu
- En-tête : « Détails de la tâche », fermeture et éventuellement action supprimer.
- Champs/affichage : titre, description, statut, priorité, date d'échéance, création/modification si disponibles.
- Mode lecture puis édition dans le même panneau **ou** édition directe clairement signalée (convention UI ; retenir un comportement unique pour cohérence).
- CTA « Enregistrer les modifications » si édition, « Annuler » / « Fermer ».
- Suppression déclenche M02, jamais suppression directe sans confirmation.

### Comportements
- Mise à jour de statut, priorité, champs et échéance ; reflet immédiat après succès confirmé.
- Une tâche supprimée ou devenue inaccessible doit fermer le panneau et actualiser les données avec retour adapté.
- Sur mobile : panneau plein écran ou feuille étendue, clairement refermable et sans recouvrement de la barre de navigation.

## M02 — Dialogue « Supprimer la tâche ? »
- Texte : « Vous êtes sur le point de supprimer « {titre} ». Cette action est irréversible. »
- Bouton neutre « Annuler » ; bouton destructif « Supprimer la tâche ».
- Focus initial sur l'action non destructive ; ne pas permettre une suppression involontaire via Entrée hors contrôle intentionnel.
- Pendant suppression : indicateur de chargement et bouton bloqué.
- Succès : fermer dialogue et drawer, retirer la tâche des vues, afficher confirmation.
- Échec : conserver le dialogue et afficher l'erreur ; ne pas retirer visuellement la tâche comme si tout avait réussi.

## S01 — États transversaux
| Situation | Présentation attendue |
|---|---|
| Chargement initial | Skeletons fidèles à la structure (cards, lignes, modules) |
| Aucune tâche | Illustration accueillante, titre « Une page blanche pour vos projets du jour », texte court, CTA « Créer ma première tâche » |
| Aucune recherche | Illustration plus discrète, « Aucune tâche trouvée », action « Effacer les filtres » |
| Aucun retard | Message positif « Tout est à jour ! » sans créer de notification automatique |
| Erreur de chargement | Message clair, CTA « Réessayer » |
| Échec mutation | Erreur contextualisée, état de données cohérent, possibilité de réessayer |
| Succès mutation | Toast bref + état d'interface réellement actualisé |
| Session expirée | Message explicatif et retour à Connexion, sans afficher des tâches privées |
| Champ invalide | Message sous le champ et indicateur de focus/erreur accessible |

Les textes ci-dessus sont des **propositions de microcopy opérationnelles** ; ils restent modifiables si le ton produit est préservé. Ils ne créent aucune fonctionnalité supplémentaire.

---

# 06. Données attendues par le frontend et cohérence des vues

## 6.1. Entités de présentation (contrats de forme, pas schéma backend)

### Session/UI utilisateur
- identifiant, nom, email, état de session/authentification.
- Les secrets d'authentification ne sont jamais affichés ni journalisés.

### Tâche affichable
- `id`, `title`, `description?`, `status`, `priority`, `dueDate?`, `createdAt`, `updatedAt` si disponibles.
- Statuts normalisés côté application puis traduits en libellés : À faire / En cours / Terminée.
- Priorités normalisées puis libellés : Basse / Moyenne / Haute.
- Données de propriété strictement limitées à l'utilisateur courant.

### Indicateurs du dashboard
- total, à faire, en cours, terminées, en retard, taux de progression, répartition par statut.
- Origine validée : **statistiques calculées par le service** et restituées au frontend. Ne pas inventer de valeurs ou forcer le calcul local comme source d'autorité.

## 6.2. Règles de calcul/affichage dans l'interface
- Une tâche « en retard » est non terminée et possède une échéance dans le passé, selon une convention de date clairement fixée à l'intégration.
- Échéance absente = « Sans échéance » ou absence de badge, jamais « En retard ».
- Taux de progression = nombre terminées / total selon indicateur fourni ; si total = 0, état vide.
- Ne pas mélanger fuseau local et UTC sans conversion explicite ; une date sans heure doit s'afficher comme date calendaire locale pour éviter le décalage d'un jour.
- Répartition/statistiques et cartes doivent rester synchronisées après opérations.

## 6.3. Intégration réseau vue depuis React uniquement
Ce document ne définit **aucune architecture serveur ni implémentation NestJS**.
- Prévoir un adaptateur frontend typé pour les opérations de session, profil, tâches et lecture des statistiques.
- Isoler les détails HTTP des composants d'affichage.
- Gérer chargement, réponse valide, erreur de validation, refus d'accès, expiration de session, indisponibilité réseau et tentative de relance.
- S'adapter au contrat d'API réel fourni ultérieurement ; **ne pas inventer** des URLs d'API définitives, des noms de payload, des mécanismes de refresh ou des codes de réponse supposés.
- Pour l'état d'authentification, privilégier une stratégie sûre compatible avec la session persistante retenue ; éviter de stocker des secrets dans un stockage exposé au JavaScript si des cookies sécurisés sont disponibles.
- Les exemples de données sont autorisés pour le prototypage/Storybook, pas comme source de vérité de l'application livrée.

---

# 07. Comportement responsive détaillé

| Contexte | Navigation | Contenu | Overlays |
|---|---|---|---|
| Desktop large | sidebar + topbar | grille stats 3–5 colonnes selon largeur, blocs en deux colonnes si viable | modale centrée, drawer droit |
| Desktop compact/tablette | sidebar comprimée/adaptée + topbar | cartes réorganisées, outils de filtre compactés sans masquer leur sens | modale et drawer réduits, scroll interne |
| Mobile | bottom nav + topbar compacte | cartes sur une colonne ; graphique redimensionné ; onglets visibles | création en feuille ou plein écran ; détails plein écran/feuille |

**Breakpoints recommandés (convention) :** mobile < 640 px ; tablette 640–1023 px ; desktop ≥ 1024 px. Ne pas utiliser de largeur fixe causant un scroll horizontal de toute la page. Le **seul** défilement horizontal volontaire majeur est celui des colonnes Kanban sur mobile.

### Mobile — contrôles critiques
- CTA Nouvelle tâche toujours visible sans recouvrir les cartes.
- Recherche, filtres et tri accessibles sur petit écran (barre réorganisée ou panneau de filtres si nécessaire, pas de nouvelle destination métier).
- Champs suffisamment grands pour l'usage tactile, clavier adapté aux emails.
- Les actions des cartes restent utilisables sans hover.
- Les popovers/menus ne dépassent pas le viewport.
- Les contenus longs se coupent/tronquent sans casser la mise en page ; détail intégral dans le drawer.

---

# 08. Motion design, transitions et feedback

## 8.1. Principes validés
Effets **expressifs et maîtrisés** : transitions de page douces, apparition progressive des cartes, hover riche mais rapide, transitions d'état fluides, drawer et modales polis, drag-and-drop lisible. Pas de mouvement permanent distrayant.

## 8.2. Conventions techniques proposées
- Micro-interactions : ~160–220 ms.
- Modales/drawer : ~220–320 ms.
- Décor d'accueil : mouvement subtil ou léger effet de lumière sans surcharge GPU.
- Easing de sortie/entrée cohérent ; éviter l'effet élastique omniprésent.
- Respect strict de `prefers-reduced-motion` : désactiver les translations et séquences non essentielles ; conserver l'information.
- Les transitions ne doivent pas retarder un bouton ou masquer une réponse système.
- Drag : carte élevée légèrement, zone de dépôt contrastée, animation de réorganisation, rollback visuel en cas d'échec.

---

# 09. Accessibilité et qualité d'usage

- Viser WCAG 2.2 AA comme référentiel de mise en œuvre (convention qualité).
- Navigation clavier sur liens, menus, formulaires, onglets, boutons, dialogues et contrôle de statut du Kanban.
- Focus visible et non masqué par une ombre/gradient.
- Contrastes texte/fond contrôlés en mode clair et sombre ; badge de couleur toujours légendé.
- Libellés persistants, messages d'erreur contextualisés, noms accessibles pour boutons icônes.
- Liens et boutons respectent leur sémantique HTML ; aucun div cliquable sans sémantique appropriée.
- Announce changement de statut et feedback important via région `aria-live` si nécessaire.
- Gestion des modales : rôle dialog, libellé, focus initial, focus trap, fermeture, restitution du focus.
- Respect du zoom navigateur jusqu'à 200 % sans perte d'accès aux fonctions essentielles.
- Tailles tactiles confortables et espaces entre éléments destructifs.
- États de chargement exprimés de façon textuelle ou accessible.

---

# 10. Qualité frontend et stratégie de réalisation

## 10.1. Technologie validée
- **React + TypeScript + Tailwind CSS**.
- Icônes Lucide, bibliothèques UI ou animation seulement si elles servent effectivement le résultat et restent cohérentes avec ces choix.
- Architecture composantielle, styles via tokens, état de données maîtrisé. Le choix exact d'un router, d'un système de formulaires ou de fetching est **libre** : ne pas présupposer une bibliothèque non validée.

## 10.2. Phases de réalisation recommandées
1. Initialiser le frontend, les tokens, typographies et thèmes ; socle AppShell.
2. Construire E01 et E02 et les états de validation.
3. Construire les composants de tâches, modale M01, drawer P01 et dialogue M02.
4. Implémenter E04 Liste avec recherche, filtres et tri ; puis Kanban desktop/mobile.
5. Implémenter E03 avec statistiques/graphique reliés à des données réelles.
6. Implémenter E05 ; session, erreurs et actions de sécurité côté interface.
7. Finaliser responsive, animations, accessibilité, interactions et recette.

**Important :** l'objectif pédagogique d'une journée est ambitieux pour un full-stack de qualité et un double thème. Ne jamais « finir » en laissant des boutons factices ; livrer les fonctionnalités validées, quitte à simplifier un effet purement décoratif.

## 10.3. États et tests à couvrir

### Authentification
- Inscription valide et invalide ; connexion valide/invalide.
- Persistance après refresh ; accès aux routes protégées ; déconnexion.
- Erreur réseau, doubles clics, contrôle d'affichage mot de passe.

### Tâches
- Créer sans échéance ; créer avec échéance.
- Modifier titre, description, priorité, statut, échéance.
- Supprimer avec confirmation ; annuler sans mutation.
- Filtrer, chercher et trier en Liste ; rendre zéro résultat.
- Déplacer Kanban d'un statut à un autre ; retrouver la tâche au bon endroit après actualisation ; gérer échec de mise à jour.
- Modifier statut au clavier et sur mobile sans drag-and-drop.
- Vérifier qu'une tâche terminée n'apparaît pas en retard.

### Dashboard
- Cohérence des nombres et graphes ; zéro tâche ; absence de retard et de priorité haute.
- Mise à jour visible après création, modification, suppression, changement de statut.

### Profil et thèmes
- Modifier nom/email ; modifier mot de passe ; erreurs clairement gérées.
- Thème OS initial, bascule manuelle, persistance, adaptation du contraste et des illustrations.

### Responsive et accessibilité
- Desktop/tablette/mobile ; clavier seul, focus dialogues, zoom, `prefers-reduced-motion`, contenus longs, scroll Kanban mobile.

## 10.4. Critères d'acceptation généraux
- [ ] Tous les écrans et interfaces de l'inventaire sont présents, sans page supplémentaire non justifiée.
- [ ] Le frontend respecte les décisions D01–D08.
- [ ] Aucun élément factice, aucune statistique figée, aucun bouton inactif présenté comme fonctionnel.
- [ ] Liste et Kanban affichent les mêmes tâches et les mêmes modifications.
- [ ] Les données personnelles restent isolées visuellement et au niveau du contrôle d'accès fourni par le service.
- [ ] Toutes les erreurs critiques sont représentées avec une action utile.
- [ ] Modes clair et sombre entièrement designés et testés.
- [ ] Les écrans sont visuellement convaincants : illustrations, halos, profondeur, animations contrôlées.
- [ ] Le responsive est conçu, pas seulement compressé.
- [ ] Les comportements accessibles remplacent/complètent les gestes complexes.
- [ ] Les tests des parcours majeurs passent.

---

# 11. Registre des décisions et points non spécifiés

## 11.1. Décisions métier/produit expressément validées
- **D01** : personnel, dashboard, CRUD, recherche/filtre/tri, profil, Liste/Kanban, échéance et priorité, V1 soignée.
- **D02** : email/mot de passe, session persistante, profil modifiable, tâches privées, mot de passe oublié reporté.
- **D03** : À faire/En cours/Terminée ; Basse/Moyenne/Haute ; échéances facultatives et retards ; drag-and-drop ; historique ; progression/répartition/retards.
- **D04** : sidebar + topbar desktop ; Liste et Kanban dans Mes tâches ; création modale ; détails/modification drawer ; bottom nav mobile.
- **D05** : Soft Productivity ; Violet Serenity ; Sora / DM Sans ; effets plus expressifs ; modes clair et sombre ; illustrations présentes.
- **D06** : arrondis/aération ; boutons dégradés ; formulaires bordés avec labels ; animations expressives maîtrisées ; éléments lumineux et glassmorphism ; responsive dédié.
- **D07** : dashboard enrichi ; Liste en cartes ; création complète ; profil centré identité/sécurité ; états vides illustrés ; Kanban mobile à scroll horizontal et contrôle de statut.
- **D08** : frontend React/TS/Tailwind ; thème OS + préférence mémorisée ; statistiques produites par le service ; livraison complète testée responsive. Stack serveur validée mais **non détaillée ici**.

## 11.2. Conventions proposées, à adapter si besoin sans changer le périmètre
- Noms d'URL des pages ; choix de la bibliothèque de formulaires, du router et des composants.
- Détails chiffrés des espacements, animations, breakpoints et couleurs sémantiques.
- Texte précis des messages/illustrations.
- Champ « confirmer le mot de passe » à l'inscription et au changement de mot de passe.
- Statut initial « À faire » lors de la création ; options exactes de tri et de filtre.
- Présentation des composants de profil et du contrôle de thèmes.

## 11.3. Dépendances d'intégration à confirmer, sans bloquer la maquette
- Contrat exact des requêtes et réponses du service : aucune route HTTP définitive n'est créée dans ce document.
- Comportement post-inscription (session directement ouverte ou connexion ensuite).
- Règles exactes de validation des mots de passe et erreurs applicatives.
- Convention précise du format/date d'échéance et du calcul du retard pour éviter les décalages temporels.
- Mécanisme concret de session persistante et de sa vérification au chargement.

Ces points sont **techniques ou de précision**, pas des autorisations d'ajouter des fonctionnalités.

---

# 12. Instruction finale à l'agent frontend

Construire le **frontend TASKORA complet** en suivant ce document dans son intégralité. Produire une interface harmonieuse, premium et expressive, pas un dashboard générique. Favoriser une composition soignée, des niveaux de profondeur, des illustrations de qualité, une navigation irréprochable et des micro-interactions utiles. Les boutons, onglets, modales, formulaires, filtres, transitions de statut et actions de profil doivent fonctionner. Implémenter les états chargement, vide, succès, erreur et les contraintes responsive. Garantir l'accessibilité clavier, les deux thèmes et la cohérence des données réelles.

**Interdictions :** inventer des modules ; transformer Liste/Kanban en pages métiers indépendantes ; supprimer les tâches terminées du suivi ; imposer l'échéance ; rendre le drag-and-drop obligatoire sur mobile ; simuler une fonctionnalité en la déclarant opérationnelle ; générer dans `llm.md` une architecture ou implémentation backend.

**Définition du terminé :** toutes les interfaces spécifiées sont présentes, cohérentes, testées, responsive, accessibles et connectables au contrat réel du service. Le rendu est aussi abouti dans les détails que dans la page d'accueil.
