import { expect, test, type Page } from '@playwright/test';
import { createTask, register } from './helpers';

const column = (page: Page, name: string) => page.getByRole('region', { name });

test.describe('Kanban', () => {
  test('drag-and-drop souris : statut persisté, compteurs synchronisés', async ({ page }) => {
    await register(page);
    await page.goto('/taches?vue=kanban');
    await createTask(page, { title: 'Carte mobile', priority: 'Haute' });
    await createTask(page, { title: 'Carte fixe' });

    const todo = column(page, 'À faire');
    const doing = column(page, 'En cours');
    await expect(todo.getByRole('article')).toHaveCount(2);
    await expect(todo.getByLabel('2 tâches')).toBeVisible();

    const source = todo.getByRole('article').filter({ hasText: 'Carte mobile' }).locator('p, span').filter({ hasText: 'Haute' }).first();
    const from = (await source.boundingBox())!;
    const to = (await doing.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y + 10, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 15 });
    await expect(doing).toHaveClass(/ring-4/); // zone de dépôt mise en évidence
    await page.mouse.up();

    await expect(doing.getByRole('article').filter({ hasText: 'Carte mobile' })).toBeVisible();
    await expect(todo.getByRole('article')).toHaveCount(1);
    await expect(doing.getByLabel('1 tâche')).toBeVisible();

    await page.reload();
    await expect(column(page, 'En cours').getByRole('article').filter({ hasText: 'Carte mobile' })).toBeVisible();

    // Liste et Kanban affichent les mêmes données.
    await page.getByRole('tab', { name: 'Liste' }).click();
    await expect(page.getByRole('article').filter({ hasText: 'Carte mobile' })).toContainText('En cours');
  });

  test('alternative clavier : sélecteur de statut, onglets au clavier', async ({ page }) => {
    await register(page);
    await page.goto('/taches');
    await createTask(page, { title: 'Au clavier' });
    await page.getByRole('tab', { name: 'Liste' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Kanban' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/vue=kanban/);

    const select = column(page, 'À faire').getByLabel('Statut de « Au clavier »');
    await select.focus();
    await select.selectOption('DONE');
    await expect(column(page, 'Terminée').getByRole('article').filter({ hasText: 'Au clavier' })).toBeVisible();
    await expect(page.locator('[aria-live="polite"]').first()).toHaveText(/déplacée vers Terminée/);
  });

  test('échec de mise à jour : état précédent restauré et message explicite', async ({ page }) => {
    await register(page);
    await page.goto('/taches?vue=kanban');
    await createTask(page, { title: 'Réseau capricieux' });
    await page.route('**/api/v1/tasks/*', (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'x' }) }) : route.continue(),
    );
    await column(page, 'À faire').getByLabel('Statut de « Réseau capricieux »').selectOption('IN_PROGRESS');
    await expect(page.getByRole('alert').filter({ hasText: 'Déplacement impossible' })).toBeVisible();
    await expect(column(page, 'À faire').getByRole('article').filter({ hasText: 'Réseau capricieux' })).toBeVisible();
    await expect(column(page, 'En cours').getByRole('article')).toHaveCount(0);
  });
});
