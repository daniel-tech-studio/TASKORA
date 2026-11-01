import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { isValidCivilDate } from '../time/civil-date';

@ValidatorConstraint({ name: 'isCivilDate' })
export class IsCivilDate implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidCivilDate(value);
  }
  defaultMessage(): string {
    return "La date d'échéance doit être une date réelle au format AAAA-MM-JJ";
  }
}
