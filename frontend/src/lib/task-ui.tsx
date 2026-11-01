import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskDetailDrawer } from '../components/tasks/TaskDetailDrawer';
import type { Task } from './types';

interface TaskUiValue {
  openCreate(): void;
  openTask(task: Pick<Task, 'id'> & Partial<Task>): void;
}

const TaskUiContext = createContext<TaskUiValue | null>(null);

/** Surfaces partagées par Dashboard, Liste et Kanban : modale M01 et drawer P01. */
export function TaskUiProvider({ children }: { children: ReactNode }) {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<(Pick<Task, 'id'> & Partial<Task>) | null>(null);

  const openCreate = useCallback(() => setCreating(true), []);
  const openTask = useCallback((task: Pick<Task, 'id'> & Partial<Task>) => setSelected(task), []);
  const value = useMemo(() => ({ openCreate, openTask }), [openCreate, openTask]);

  return (
    <TaskUiContext.Provider value={value}>
      {children}
      <CreateTaskModal open={creating} onClose={() => setCreating(false)} />
      <TaskDetailDrawer taskId={selected?.id ?? null} initial={selected} onClose={() => setSelected(null)} />
    </TaskUiContext.Provider>
  );
}

export function useTaskUi(): TaskUiValue {
  const ctx = useContext(TaskUiContext);
  if (!ctx) throw new Error('useTaskUi hors TaskUiProvider');
  return ctx;
}
