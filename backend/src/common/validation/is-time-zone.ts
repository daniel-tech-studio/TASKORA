import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { isValidTimeZone } from '../time/civil-date';

@ValidatorConstraint({ name: 'isTimeZone' })
export class IsTimeZone implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidTimeZone(value);
  }
  defaultMessage(): string {
    return 'Fuseau horaire IANA invalide';
  }
}
