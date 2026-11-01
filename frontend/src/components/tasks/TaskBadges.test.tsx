import { render, screen } from '@testing-library/react';
import { DueDateLabel, TaskPriorityBadge, TaskStatusBadge } from './TaskBadges';

describe('badges de tâche', () => {
  it('libellés français toujours présents (la couleur n’est jamais seule)', () => {
    render(
      <>
        <TaskStatusBadge status="IN_PROGRESS" />
        <TaskPriorityBadge priority="HIGH" />
      </>,
    );
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByText('Haute')).toBeInTheDocument();
  });

  it('retard affiché seulement pour une tâche non terminée', () => {
    const { rerender } = render(<DueDateLabel task={{ dueDate: '2020-01-01', isOverdue: true, status: 'TODO' }} />);
    expect(screen.getByText(/En retard/)).toBeInTheDocument();
    rerender(<DueDateLabel task={{ dueDate: '2020-01-01', isOverdue: true, status: 'DONE' }} />);
    expect(screen.queryByText(/En retard/)).not.toBeInTheDocument();
    rerender(<DueDateLabel task={{ dueDate: null, isOverdue: false, status: 'TODO' }} showEmpty />);
    expect(screen.getByText('Sans échéance')).toBeInTheDocument();
  });
});
