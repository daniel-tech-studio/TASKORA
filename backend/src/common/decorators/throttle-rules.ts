import { Throttle } from '@nestjs/throttler';
import { loadConfig, ThrottleRule } from '../../config/app-config';

let cached: ReturnType<typeof loadConfig>['throttle'] | undefined;
const rules = () => (cached ??= loadConfig().throttle);

/** Seuil renforcé appliqué à une route, résolu paresseusement depuis la configuration validée. */
export const ThrottleRuleFor = (name: 'login' | 'register' | 'refresh') =>
  Throttle({
    default: {
      limit: () => (rules()[name] as ThrottleRule).limit,
      ttl: () => (rules()[name] as ThrottleRule).ttlMs,
    },
  });
