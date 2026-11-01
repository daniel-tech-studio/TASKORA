import { expect, test, type Page } from '@playwright/test';
import { civil, createTask, register, statCard } from './helpers';

const card = (page: Page, title: string) => page.getByRole('article').filter({ has: page.getByRole('button', { name: title, exact: true }) });

test.describe('Tâches — Liste, drawer, suppression, dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await register(page);
  });

  test('création sans/avec échéance, reflet dans Liste et Dashboard', async ({ page }) => {
    await page.getByRole('main').getByRole('button', { name: 'Créer ma première tâche' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle tâche' });
    await expect(dialog.getByLabel('Titre de la tâche')).toBeFocused();
    // Validation avant envoi : titre requis.
    await dialog.getByRole('button', { name: 'Créer la tâche' }).click();
    await expect(dialog.getByText('Le titre est obligatoire.')).toBeVisible();
    await dialog.getByLabel('Titre de la tâche').fill('Sans échéance');
    await dialog.getByRole('button', { name: 'Créer la tâche' }).click();
    await expect(dialog).toBeHidden();

    await createTask(page, { title: 'Avec échéance', priority: 'Haute', dueDate: civil(3), description: 'Un détail utile' });
    await expect(statCard(page, 'Total')).toContainText('2');
    await expect(statCard(page, 'À faire')).toContainText('2');
    await expect(page.getByRole('region', { name: 'Tâches prioritaires' }).or(page.locator('section', { has: page.getByRole('heading', { name: 'Tâches prioritaires' }) }))).toContainText('Avec échéance');

    await page.getByRole('link', { name: 'Mes tâches' }).first().click();
    await expect(page.getByText('2 tâches au total')).toBeVisible();
    await expect(card(page, 'Avec échéance')).toContainText('Haute');
    await expect(card(page, 'Avec échéance')).toContainText('Un détail utile');
    await expect(card(page, 'Sans échéance')).toContainText('Moyenne');
  });

  test('modification dans le drawer puis suppression avec confirmation (annuler puis confirmer)', async ({ page }) => {
    await page.goto('/taches');
    await createTask(page, { title: 'Brouillon' });
    await page.getByRole('button', { name: 'Brouillon', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Détails de la tâche' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Enregistrer les modifications' })).toBeDisabled();

    await drawer.getByLabel('Titre de la tâche').fill('Version finale');
    await drawer.getByLabel('Description').fill('Relue et validée');
    await drawer.getByLabel('Priorité').selectOption({ label: 'Haute' });
    await drawer.getByLabel('Statut').selectOption({ label: 'En cours' });
    await drawer.getByLabel("Date d'échéance").fill(civil(7));
    await drawer.getByRole('button', { name: 'Enregistrer les modifications' }).click();
    await expect(page.getByText('Modifications enregistrées')).toBeVisible();
    await expect(card(page, 'Version finale')).toContainText('Haute');
    await expect(card(page, 'Version finale')).toContainText('Relue et validée');

    // Persistance après actualisation.
    await page.reload();
    await expect(card(page, 'Version finale')).toContainText('En cours');

    await page.getByRole('button', { name: 'Version finale', exact: true }).click();
    await drawer.getByRole('button', { name: 'Supprimer la tâche' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Supprimer la tâche ?' });
    await expect(confirm).toContainText('« Version finale »');
    await expect(confirm.getByRole('button', { name: 'Annuler' })).toBeFocused(); // focus sur l'action non destructive
    await confirm.getByRole('button', { name: 'Annuler' }).click();
    await expect(confirm).toBeHidden();
    await expect(drawer).toBeVisible();

    await drawer.getByRole('button', { name: 'Supprimer la tâche' }).click();
    await confirm.getByRole('button', { name: 'Supprimer la tâche' }).click();
    await expect(page.getByText('Tâche supprimée')).toBeVisible();
    await expect(drawer).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Une page blanche pour vos projets du jour' })).toBeVisible();
  });

  test('abandon de saisie protégé ; Échap et restitution du focus', async ({ page }) => {
    await page.goto('/taches');
    const trigger = page.getByRole('main').getByRole('button', { name: 'Nouvelle tâche' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle tâche' });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await dialog.getByLabel('Titre de la tâche').fill('Saisie en cours');
    await page.keyboard.press('Escape');
    const discard = page.getByRole('alertdialog', { name: 'Abandonner cette tâche ?' });
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: 'Continuer la saisie' }).click();
    await expect(dialog.getByLabel('Titre de la tâche')).toHaveValue('Saisie en cours');
    // Piège du focus : Tab depuis le dernier bouton revient dans la modale.
    await dialog.getByRole('button', { name: 'Créer la tâche' }).focus();
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  });

  test('recherche, filtres, tri, zéro résultat distinct de zéro tâche', async ({ page }) => {
    await page.goto('/taches');
    await createTask(page, { title: 'Écrire le rapport', priority: 'Haute', dueDate: civil(-2) });
    await createTask(page, { title: 'Appeler le client', priority: 'Basse', dueDate: civil(5) });
    await createTask(page, { title: 'Ranger le bureau', status: 'Terminée', dueDate: civil(-5) });

    await page.getByLabel('Rechercher une tâche').fill('ecrire');
    await expect(page.getByText('1 tâche correspondante')).toBeVisible();
    await expect(card(page, 'Écrire le rapport')).toBeVisible();
    await expect(page).toHaveURL(/q=ecrire/);

    await page.getByLabel('Rechercher une tâche').fill('introuvable');
    await expect(page.getByRole('heading', { name: 'Aucune tâche trouvée' })).toBeVisible();
    await page.getByRole('button', { name: 'Effacer les filtres' }).click();
    await expect(page.getByText('3 tâches au total')).toBeVisible();

    // Retard : non terminée et échéance passée uniquement.
    await page.getByLabel('Filtrer par échéance').selectOption({ label: 'En retard' });
    await expect(page.getByText('1 tâche correspondante')).toBeVisible();
    await expect(card(page, 'Écrire le rapport')).toContainText('En retard');
    await page.getByLabel('Filtrer par échéance').selectOption({ label: 'Toutes les échéances' });
    await expect(card(page, 'Ranger le bureau')).not.toContainText('En retard');

    await page.getByLabel('Filtrer par priorité').selectOption({ label: 'Basse' });
    await expect(page.getByText('1 tâche correspondante')).toBeVisible();
    await page.getByRole('button', { name: 'Réinitialiser' }).click();

    await page.getByLabel('Trier par').selectOption({ label: 'Tri : Priorité' });
    const titles = page.locator('article h3');
    await expect(titles.first()).toHaveText('Écrire le rapport');
    await page.getByRole('button', { name: /Ordre décroissant/ }).click();
    await expect(titles.first()).toHaveText('Appeler le client');

    // Les tâches terminées restent consultables.
    await page.getByLabel('Filtrer par statut').selectOption({ label: 'Terminée' });
    await expect(card(page, 'Ranger le bureau')).toBeVisible();
    await page.reload(); // filtres conservés dans l'URL
    await expect(page.getByLabel('Filtrer par statut')).toHaveValue('DONE');
  });

  test('changement de statut depuis la carte, terminée jamais en retard, dashboard synchronisé', async ({ page }) => {
    await page.goto('/taches');
    await createTask(page, { title: 'Facture en retard', dueDate: civil(-1), priority: 'Haute' });
    await expect(card(page, 'Facture en retard')).toContainText('En retard');
    await card(page, 'Facture en retard').getByLabel('Statut de « Facture en retard »').selectOption('DONE');
    await expect(page.getByText('Statut mis à jour : Terminée')).toBeVisible();
    await expect(card(page, 'Facture en retard')).not.toContainText('En retard');

    await page.getByRole('link', { name: 'Tableau de bord' }).first().click();
    await expect(statCard(page, 'Terminées')).toContainText('1');
    await expect(statCard(page, 'En retard')).toContainText('0');
    await expect(page.getByText('1 sur 1 tâche terminée')).toBeVisible();
    await expect(page.getByText('Tout est à jour !')).toBeVisible();
    await expect(page.getByText('100 %').first()).toBeVisible();
  });
});
