import { Injectable } from '@nestjs/common';

/** Horloge injectable : remplaçable dans les tests de fuseaux et d'échéances (backend.md C4). */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
