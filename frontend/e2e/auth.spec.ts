import { expect, test } from '@playwright/test';
import { PASSWORD, register, uniqueEmail } from './helpers';

test.describe('Authentification', () => {
  test('inscription → session ouverte, persistante après actualisation, puis déconnexion', async ({ page }) => {
    await register(page, 'Kofi Mensah');
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    await expect(page.getByText('Bonjour, Kofi 👋')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pas encore de tâches' })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/tableau-de-bord$/);
    await expect(page.getByText('Bonjour, Kofi 👋')).toBeVisible();

    // Aucun jeton accessible au JavaScript de la page (cookies HttpOnly).
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/taskora_(access|refresh)/);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/eyJ/);

    await page.getByRole('button', { name: /Compte de Kofi Mensah/ }).click();
    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/connexion$/);
    await page.goto('/taches');
    await expect(page).toHaveURL(/\/connexion$/);
  });

  test('route privée → connexion → retour à la destination initiale', async ({ page }) => {
    const { email } = await register(page);
    await page.getByRole('button', { name: /Compte de/ }).click();
    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/connexion$/);

    await page.goto('/taches?vue=kanban');
    await expect(page).toHaveURL(/\/connexion$/);
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Mot de passe', { exact: true }).press('Enter');
    await expect(page).toHaveURL(/\/taches\?vue=kanban$/);
    await expect(page.getByRole('tab', { name: 'Kanban' })).toHaveAttribute('aria-selected', 'true');

    // Utilisateur connecté sur un écran d'authentification → tableau de bord.
    await page.goto('/connexion');
    await expect(page).toHaveURL(/\/tableau-de-bord$/);
  });

  test('connexion : validation locale, identifiants invalides sans perte de l’email, affichage du mot de passe', async ({ page }) => {
    await page.goto('/connexion');
    await expect(page.getByRole('link', { name: /oublié/i })).toHaveCount(0);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText("L'adresse e-mail est obligatoire.")).toBeVisible();
    await expect(page.getByLabel('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel('Adresse e-mail').fill('pas-un-email');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText(/Saisissez une adresse e-mail valide/)).toBeVisible();

    const email = uniqueEmail('inconnu');
    await page.getByLabel('Adresse e-mail').fill(email);
    const pwd = page.getByLabel('Mot de passe', { exact: true });
    await pwd.fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Afficher le mot de passe' }).click();
    await expect(pwd).toHaveAttribute('type', 'text');
    await expect(pwd).toHaveValue('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Masquer le mot de passe' }).click();
    await expect(pwd).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Adresse e-mail ou mot de passe incorrect.' })).toBeVisible();
    await expect(page.getByLabel('Adresse e-mail')).toHaveValue(email);
  });

  test('inscription : erreurs inline, mots de passe différents, email déjà utilisé', async ({ page }) => {
    const { email } = await register(page);
    await page.context().clearCookies();
    await page.goto('/inscription');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page.getByText('Le nom est obligatoire.')).toBeVisible();

    await page.getByLabel('Nom complet').fill('Doublon');
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill('court');
    await page.getByLabel('Confirmer le mot de passe').fill('autre');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page.getByText(/au moins 8 caractères\./)).toBeVisible();
    await expect(page.getByText('Les mots de passe ne correspondent pas.')).toBeVisible();

    await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirmer le mot de passe').fill(PASSWORD);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page.getByText('Cette adresse e-mail est déjà utilisée.')).toBeVisible();
    await expect(page).toHaveURL(/\/inscription$/);
  });

  test('session expirée/révoquée : retour à la connexion sans afficher de données privées', async ({ page }) => {
    await register(page);
    await page.goto('/taches');
    await expect(page.getByRole('heading', { name: 'Mes tâches' })).toBeVisible();
    // Révocation côté serveur (ex. déconnexion depuis un autre onglet), cookies conservés côté page.
    const cookies = await page.context().cookies();
    await page.request.post('/api/v1/auth/logout', {
      headers: { Origin: 'http://localhost:5273', 'X-CSRF-Token': (await (await page.request.get('/api/v1/auth/csrf')).json()).csrfToken },
    });
    await page.context().addCookies(cookies.filter((c) => c.name.includes('taskora_')));
    // Action suivante : 401 → refresh refusé → session expirée.
    await page.getByRole('main').getByRole('button', { name: 'Nouvelle tâche' }).click();
    await page.getByLabel('Titre de la tâche').fill('Après révocation');
    await page.getByRole('button', { name: 'Créer la tâche' }).click();
    await expect(page).toHaveURL(/\/connexion$/);
    await expect(page.getByText('Après révocation')).toHaveCount(0);
    await expect(page.getByText('Votre session a expiré. Reconnectez-vous pour continuer.')).toBeVisible();
  });
});
