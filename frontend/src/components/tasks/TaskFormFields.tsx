import type { RefObject } from 'react';
import { CharCounter, SelectField, TextArea, TextField } from '../ui/Field';
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '../../lib/labels';
import { DESCRIPTION_MAX, TITLE_MAX, type TaskFormErrors, type TaskFormValues } from './task-form';

interface Props {
  values: TaskFormValues;
  errors: TaskFormErrors;
  onChange<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]): void;
  titleRef?: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

/** Champs communs à la création (M01) et à la modification (P01). */
export function TaskFormFields({ values, errors, onChange, titleRef, disabled }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <TextField
        ref={titleRef}
        label="Titre de la tâche"
        placeholder="Ex. Préparer la présentation"
        value={values.title}
        onChange={(e) => onChange('title', e.target.value)}
        error={errors.title}
        required
        aria-required
        maxLength={TITLE_MAX + 20}
        disabled={disabled}
        counter={values.title.length > TITLE_MAX * 0.8 ? <CharCounter value={values.title.trim()} max={TITLE_MAX} /> : undefined}
      />
      <TextArea
        label="Description"
        optional
        placeholder="Ajoutez quelques détails utiles…"
        value={values.description}
        onChange={(e) => onChange('description', e.target.value)}
        error={errors.description}
        rows={4}
        disabled={disabled}
        counter={values.description.length > 0 ? <CharCounter value={values.description} max={DESCRIPTION_MAX} /> : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Priorité"
          value={values.priority}
          onChange={(e) => onChange('priority', e.target.value as TaskFormValues['priority'])}
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
          error={errors.priority}
          disabled={disabled}
        />
        <SelectField
          label="Statut"
          value={values.status}
          onChange={(e) => onChange('status', e.target.value as TaskFormValues['status'])}
          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          error={errors.status}
          disabled={disabled}
        />
      </div>
      <TextField
        type="date"
        label="Date d'échéance"
        optional
        value={values.dueDate}
        onChange={(e) => onChange('dueDate', e.target.value)}
        error={errors.dueDate}
        min="1900-01-01"
        max="9999-12-31"
        disabled={disabled}
        hint="Laissez vide si la tâche n'a pas d'échéance."
      />
    </div>
  );
}
