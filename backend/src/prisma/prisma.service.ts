import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
    // backend.md F5 : clés étrangères actives, WAL et délai de contention raisonnable.
    // Les PRAGMA renvoient une ligne : $queryRawUnsafe plutôt que $executeRaw.
    await this.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    await this.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await this.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
