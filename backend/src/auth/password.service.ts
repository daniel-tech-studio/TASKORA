import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** Hashage Argon2id (backend.md E1). Paramètres OWASP : m=19 MiB, t=2, p=1. */
@Injectable()
export class PasswordService {
  private readonly options = { type: argon2.argon2id as 0 | 1 | 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };
  // Hash factice pour un temps de réponse comparable quand l'email est inconnu.
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  async burnTime(password: string): Promise<void> {
    this.dummyHash ??= this.hash('taskora-dummy-password');
    await this.verify(await this.dummyHash, password);
  }
}
