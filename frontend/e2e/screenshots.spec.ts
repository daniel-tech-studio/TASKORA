import { test, type Page } from '@playwright/test';
import { civil, createTask, register } from './helpers';

/**
 * Captures de recette visuelle (llm.md 12) : exécuter avec CAPTURE=1.
 * Les images sont écrites dans ../docs/screenshots.
 */
test.skip(!process.env.CAPTURE, 'Captures uniquement sur demande (CAPTURE=1)');

const OUT = '../docs/screenshots';
// Captures à la taille de l'écran (sans pleine page) : sidebar et barre mobile fixes restent fidèles.
const VIEWPORTS = { desktop: { width: 1440, height: 1240 }, tablet: { width: 820, height: 1180 }, mobile: { width: 390, height: 844 } };
const AUTH = { width: 1440, height: 900 };

async function seed(page: Page) {
  await register(page, 'Camille Martin');
  await page.goto('/taches');
  await createTask(page, { title: 'Préparer la présentation du projet', description: 'Slides de synthèse et démo de 5 minutes.', priority: 'Haute', status: 'En cours', dueDate: civil(2) });
  await createTask(page, { title: 'Relire le rapport trimestriel', priority: 'Haute', dueDate: civil(-2) });
  await createTask(page, { title: 'Réserver la salle de réunion', priority: 'Moyenne', dueDate: civil(5) });
  await createTask(page, { title: 'Mettre à jour la documentation', description: 'Section installation et dépannage.', priority: 'Basse' });
  await createTask(page, { title: 'Envoyer le compte rendu', priority: 'Moyenne', status: 'Terminée', dueDate: civil(-1) });
  await createTask(page, { title: 'Faire le point avec le mentor', priority: 'Moyenne', status: 'En cours', dueDate: civil(1) });
}

for (const theme of ['light', 'dark'] as const) {
  test(`captures ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.setViewportSize(AUTH);
    await page.goto('/connexion');
    await page.getByRole('heading', { name: 'Bon retour sur TASKORA' }).waitFor();
    await page.screenshot({ path: `${OUT}/${theme}-desktop-connexion.png` });
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.screenshot({ path: `${OUT}/${theme}-mobile-connexion.png` });
    await page.setViewportSize(AUTH);
    await page.goto('/inscription');
    await page.getByRole('heading', { name: 'Créez votre espace TASKORA' }).waitFor();
    await page.screenshot({ path: `${OUT}/${theme}-desktop-inscription.png` });
    await page.setViewportSize(VIEWPORTS.desktop);
    await seed(page);

    for (const [name, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size);
      await page.goto('/tableau-de-bord');
      await page.getByText('Progression globale').waitFor();
      await page.screenshot({ path: `${OUT}/${theme}-${name}-dashboard.png` });
      await page.goto('/taches');
      await page.getByRole('article').first().waitFor();
      await page.screenshot({ path: `${OUT}/${theme}-${name}-liste.png` });
      await page.goto('/taches?vue=kanban');
      await page.locator('[data-column="DONE"] article').first().waitFor();
      await page.screenshot({ path: `${OUT}/${theme}-${name}-kanban.png` });
      await page.goto('/profil');
      await page.getByRole('heading', { name: 'Sécurité' }).waitFor();
      await page.screenshot({ path: `${OUT}/${theme}-${name}-profil.png` });
    }

    await page.setViewportSize(AUTH);
    await page.goto('/taches');
    await page.getByRole('button', { name: 'Préparer la présentation du projet', exact: true }).click();
    await page.getByRole('dialog', { name: 'Détails de la tâche' }).waitFor();
    await page.screenshot({ path: `${OUT}/${theme}-desktop-drawer.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('main').getByRole('button', { name: 'Nouvelle tâche' }).click();
    const modal = page.getByRole('dialog', { name: 'Nouvelle tâche' });
    await modal.getByLabel('Titre de la tâche').fill('Préparer la démo client');
    await modal.getByLabel('Priorité').selectOption({ label: 'Haute' });
    await page.screenshot({ path: `${OUT}/${theme}-desktop-modale.png` });
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.screenshot({ path: `${OUT}/${theme}-mobile-modale.png` });
    await modal.getByRole('button', { name: 'Annuler' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Abandonner' }).click();
    await modal.waitFor({ state: 'hidden' });
    await page.getByLabel('Rechercher une tâche').fill('zzzz');
    await page.getByText('Aucune tâche trouvée').waitFor();
    await page.setViewportSize(AUTH);
    await page.screenshot({ path: `${OUT}/${theme}-desktop-aucun-resultat.png` });
  });
}
