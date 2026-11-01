import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('rôle alertdialog, focus initial sur Annuler, Échap annule sans confirmer', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="Supprimer la tâche ?" confirmLabel="Supprimer la tâche" destructive onConfirm={onConfirm} onCancel={onCancel}>
        Vous êtes sur le point de supprimer « Test ».
      </ConfirmDialog>,
    );
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer la tâche ?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus());
    await userEvent.keyboard('{Enter}'); // Entrée active le bouton focalisé : Annuler
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
