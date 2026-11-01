import { expect, test } from '@playwright/test';
import { PASSWORD, register, uniqueEmail } from './helpers';

test.describe('Profil et thème', () => {
  test('modifier le nom (navigation rafraîchie) et l’email (mot de passe actuel requis)', async ({ page }) => {
    await register(page, 'Awa Dossou');
    await page.getByRole('link', { name: 'Mon profil' }).first().click();
    await expect(page.getByRole('heading', { name: 'Mon profil' })).toBeVisible();
    const info = page.locator('section', { has: page.getByRole('heading', { name: 'Informations personnelles' }) });

    await info.getByLabel('Nom complet').fill('Awa Dossou-Kpè');
    await info.getByRole('button', { name: 'Enregistrer les modifications' }).click();
    await expect(info.getByText('Vos informations ont été enregistrées.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compte de Awa Dossou-Kpè' })).toBeVisible();

    const newEmail = uniqueEmail('nouvel');
    await info.getByLabel('Adresse e-mail').fill(newEmail);
    const current = info.getByLabel('Mot de passe actuel');
    await expect(current).toBeVisible();
    await info.getByRole('button', { name: 'Enregistrer les modifications' }).click();
    await expect(info.getByText(/Saisissez votre mot de passe actuel/)).toBeVisible();
    await current.fill('mauvais mot de passe');
    await info.getByRole('button', { name: 'Enregistrer les modifications' }).click();
    await expect(info.getByText('Le mot de passe actuel est incorrect.')).toBeVisible();
    await current.fill(PASSWORD);
    await info.getByRole('button', { name: 'Enregistrer les modifications' }).click();
    await expect(info.getByText('Vos informations ont été enregistrées.')).toBeVisible();
    await expect(page.getByText(newEmail).first()).toBeVisible();
  });

  test('changer de mot de passe : confirmation, champs effacés après succès, reconnexion', async ({ page }) => {
    const { email } = await register(page);
    await page.goto('/profil');
    const security = page.locator('section', { has: page.getByRole('heading', { name: 'Sécurité' }) });
    await security.getByLabel('Mot de passe actuel').fill(PASSWORD);
    await security.getByLabel('Nouveau mot de passe', { exact: true }).fill('nouvelle phrase secrète');
    await security.getByLabel('Confirmer le nouveau mot de passe').fill('différente');
    await security.getByRole('button', { name: 'Modifier le mot de passe' }).click();
    await expect(security.getByText('Les mots de passe ne correspondent pas.')).toBeVisible();
    await security.getByLabel('Confirmer le nouveau mot de passe').fill('nouvelle phrase secrète');
    await security.getByRole('button', { name: 'Modifier le mot de passe' }).click();
    await expect(security.getByText(/Mot de passe modifié/)).toBeVisible();
    await expect(security.getByLabel('Mot de passe actuel')).toHaveValue('');
    await expect(security.getByLabel('Nouveau mot de passe', { exact: true })).toHaveValue('');

    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/connexion$/);
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill('nouvelle phrase secrète');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/tableau-de-bord$/);
  });

  test('thème : système par défaut, choix manuel mémorisé, mode système réactif', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/connexion');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: /Thème/ }).click();
    await page.getByRole('menuitemradio', { name: 'Clair' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: /Thème/ }).click();
    await page.getByRole('menuitemradio', { name: 'Système' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
