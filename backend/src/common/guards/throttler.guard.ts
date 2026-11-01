import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Clés de limitation (backend.md E4) : IP par défaut ; login = IP + email normalisé ;
 * refresh = IP + session. Les seuils sont fixés par route via @Throttle.
 */
@Injectable()
export class TaskoraThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const ip = request.ip ?? 'unknown';
    const path = request.path ?? '';
    if (path.endsWith('/auth/login')) {
      const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase().slice(0, 254) : '';
      return `${ip}|${email}`;
    }
    if (path.endsWith('/auth/refresh')) {
      const cookies = (request.cookies ?? {}) as Record<string, string>;
      const refresh = Object.entries(cookies).find(([k]) => k.endsWith('taskora_refresh'))?.[1] ?? '';
      return `${ip}|${refresh.split('.')[0] ?? ''}`;
    }
    return ip;
  }
}
