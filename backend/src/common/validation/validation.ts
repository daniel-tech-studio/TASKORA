import { ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException, ErrorDetails } from '../errors/app-exception';

function collect(errors: ValidationError[], prefix = '', out: ErrorDetails = {}): ErrorDetails {
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) {
      out[path] = Object.entries(error.constraints).map(([key, msg]) =>
        key === 'whitelistValidation' ? 'Champ non autorisé' : msg,
      );
    }
    if (error.children?.length) collect(error.children, path, out);
  }
  return out;
}

/** ValidationPipe global strict (backend.md E4) : propriétés inconnues refusées. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    stopAtFirstError: false,
    exceptionFactory: (errors) => AppException.validation(collect(errors)),
  });
}
