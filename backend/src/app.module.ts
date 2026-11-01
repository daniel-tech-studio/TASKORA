import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { AppConfig } from './config/app-config';
import { PrismaModule } from './prisma/prisma.module';
import { LoggingModule } from './common/logging/logging.module';
import { TimeModule } from './common/time/time.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TaskoraThrottlerGuard } from './common/guards/throttler.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { AuthGuard } from './common/guards/auth.guard';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    TimeModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ name: 'default', limit: config.values.throttle.global.limit, ttl: config.values.throttle.global.ttlMs }],
      }),
    }),
    AuthModule,
    UsersModule,
    TasksModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Ordre : limitation → CSRF/Origin (avant toute mutation) → authentification.
    { provide: APP_GUARD, useClass: TaskoraThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
