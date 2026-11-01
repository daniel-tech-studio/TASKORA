import { Injectable, LoggerService } from '@nestjs/common';
import { AppConfig } from '../../config/app-config';

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level | 'silent', number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

/** Clés dont la valeur n'est jamais écrite dans les journaux (backend.md E5). */
const SENSITIVE_KEY = /pass(word)?|secret|token|jwt|cookie|authorization|csrf|refresh|hash/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[profondeur]';
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export type LogSink = (line: string) => void;

/**
 * Journal structuré JSON (une ligne par événement), expurgé des secrets.
 * Le « sink » est remplaçable pour les tests de non-divulgation (T24).
 */
@Injectable()
export class AppLogger implements LoggerService {
  private static sink: LogSink = (line) => process.stdout.write(line + '\n');
  private readonly threshold: number;

  constructor(config: AppConfig) {
    this.threshold = ORDER[config.values.logLevel];
  }

  static setSink(sink: LogSink): void {
    AppLogger.sink = sink;
  }

  event(level: Level, event: string, fields: Record<string, unknown> = {}): void {
    if (ORDER[level] < this.threshold) return;
    const entry = { time: new Date().toISOString(), level, event, ...(redact(fields) as object) };
    AppLogger.sink(JSON.stringify(entry));
  }

  // Interface LoggerService de NestJS (messages du framework).
  log(message: unknown, context?: string): void {
    this.event('info', 'nest', { message: String(message), context });
  }
  error(message: unknown, trace?: string, context?: string): void {
    this.event('error', 'nest', { message: String(message), context, trace });
  }
  warn(message: unknown, context?: string): void {
    this.event('warn', 'nest', { message: String(message), context });
  }
  debug(message: unknown, context?: string): void {
    this.event('debug', 'nest', { message: String(message), context });
  }
  verbose(message: unknown, context?: string): void {
    this.event('debug', 'nest', { message: String(message), context });
  }
}
