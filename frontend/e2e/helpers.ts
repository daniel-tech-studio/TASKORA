import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'phrase de passe e2e';

export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@exemple.test`;
}

/** Inscription par l'interface ; la session est ouverte immédiatement (backend.md D2). */
export async function register(page: Page, name = 'Awa Dossou', email = uniqueEmail()): Promise<{ email: string; name: string }> {
  await page.goto('/inscription');
  await page.getByLabel('Nom complet').fill(name);
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirmer le mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/tableau-de-bord$/);
  return { email, name };
}

export async function createTask(
  page: Page,
  task: { title: string; description?: string; priority?: 'Basse' | 'Moyenne' | 'Haute'; status?: 'À faire' | 'En cours' | 'Terminée'; dueDate?: string },
): Promise<void> {
  await page.getByRole('main').getByRole('button', { name: 'Nouvelle tâche' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Nouvelle tâche' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Titre de la tâche').fill(task.title);
  if (task.description) await dialog.getByLabel('Description').fill(task.description);
  if (task.priority) await dialog.getByLabel('Priorité').selectOption({ label: task.priority });
  if (task.status) await dialog.getByLabel('Statut').selectOption({ label: task.status });
  if (task.dueDate) await dialog.getByLabel("Date d'échéance").fill(task.dueDate);
  await dialog.getByRole('button', { name: 'Créer la tâche' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Tâche créée').last()).toBeVisible();
}

/** Date civile locale décalée de n jours (YYYY-MM-DD). */
export function civil(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function statCard(page: Page, label: string) {
  return page.getByRole('region', { name: 'Statistiques' }).locator('div.card', { has: page.getByText(label, { exact: true }) });
}
