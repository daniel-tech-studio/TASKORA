import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppConfig, ConfigValidationError, loadConfig } from './config/app-config';
import { AppLogger } from './common/logging/app-logger';
import { setupApp } from './setup-app';
import { loadEnvFile } from './config/env-file';

async function bootstrap(): Promise<void> {
  loadEnvFile();
  try {
    loadConfig();
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(app.get(AppLogger));
  setupApp(app);
  app.enableShutdownHooks();

  const { port } = app.get(AppConfig).values;
  await app.listen(port);
  app.get(AppLogger).event('info', 'server_started', { port });
}

void bootstrap();
