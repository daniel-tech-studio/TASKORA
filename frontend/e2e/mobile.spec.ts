import { expect, test } from '@playwright/test';
import { register } from './helpers';

test.describe('Mobile', () => {
  test('navigation inférieure, Kanban à défilement horizontal, statut sans drag-and-drop', async ({ page }) => {
    await register(page);
    const bottomNav = page.getByRole('navigation', { name: 'Navigation principale' }).last();
    await expect(bottomNav).toBeVisible();
    for (const label of ['Tableau de bord', 'Mes tâches', 'Mon profil']) {
      const box = (await bottomNav.getByRole('link', { name: label }).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    await bottomNav.getByRole('link', { name: 'Mes tâches' }).click();
    await page.getByRole('tab', { name: 'Kanban' }).click();
    await page.getByRole('banner').getByRole('button', { name: 'Nouvelle tâche' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle tâche' });
    await dialog.getByLabel('Titre de la tâche').fill('Depuis le téléphone');
    await dialog.getByRole('button', { name: 'Créer la tâche' }).click();
    await expect(dialog).toBeHidden();

    // Aucun défilement horizontal de la page ; seul le Kanban défile latéralement.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const scroller = page.locator('[data-column="TODO"]').locator('..');
    expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expect(page.getByText('Faites défiler horizontalement pour parcourir les colonnes.')).toBeVisible();

    const select = page.getByLabel('Statut de « Depuis le téléphone »');
    await select.selectOption('IN_PROGRESS');
    await page.getByRole('button', { name: 'En cours' }).first().click(); // raccourci vers la colonne
    await expect(page.getByRole('region', { name: 'En cours' }).getByRole('article').filter({ hasText: 'Depuis le téléphone' })).toBeVisible();
  });

  test('drawer en plein écran, refermable', async ({ page }) => {
    await register(page);
    await page.goto('/taches');
    await page.getByRole('button', { name: 'Créer ma première tâche' }).click();
    await page.getByLabel('Titre de la tâche').fill('Détail mobile');
    await page.getByRole('button', { name: 'Créer la tâche' }).click();
    await page.getByRole('button', { name: 'Détail mobile', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Détails de la tâche' });
    const box = (await drawer.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
    await drawer.getByRole('button', { name: 'Fermer le panneau' }).click();
    await expect(drawer).toBeHidden();
  });
});
