import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppConfig } from './config/app-config';
import { createValidationPipe } from './common/validation/validation';

export const API_PREFIX = 'api/v1';

/** Configuration HTTP partagée par main.ts et les tests E2E (mêmes protections). */
export function setupApp(app: NestExpressApplication): void {
  const config = app.get(AppConfig);

  app.setGlobalPrefix(API_PREFIX);
  app.useBodyParser('json', { limit: '100kb' });
  app.use(cookieParser());
  app.use(helmet());
  if (config.values.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.enableCors({
    origin: config.values.frontendOrigins, // liste explicite, jamais « * » avec credentials
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });
  app.useGlobalPipes(createValidationPipe());

  if (config.values.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('TASKORA API')
        .setDescription(
          'API REST JSON v1. Authentification par cookies HttpOnly ; toutes les mutations exigent ' +
            "l'en-tête X-CSRF-Token (GET /auth/csrf) et une origine autorisée.",
        )
        .setVersion('1.0')
        .addCookieAuth('taskora_access', { type: 'apiKey', in: 'cookie' }, 'access')
        .addCookieAuth('taskora_refresh', { type: 'apiKey', in: 'cookie' }, 'refresh')
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });
  }
}
