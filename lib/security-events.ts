import { Redis } from '@upstash/redis';

export type SecurityEventType =
  | 'rate_limit_hit'
  | 'admin_login_failed';

export interface SecurityEvent {
  type: SecurityEventType;
  ip: string;
  detail: string;
  ts: number;
}

const EVENTS_KEY = 'security:events';
const MAX_EVENTS = 500;
const TTL_SEC = 7 * 24 * 60 * 60;

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

// Fire-and-forget — never blocks the caller, never throws
export function logSecurityEvent(event: SecurityEvent): void {
  try {
    const r = getRedis();
    const payload = JSON.stringify(event);
    r.lpush(EVENTS_KEY, payload)
      .then(() => r.ltrim(EVENTS_KEY, 0, MAX_EVENTS - 1))
      .then(() => r.expire(EVENTS_KEY, TTL_SEC))
      .catch(() => {});
  } catch {
    // Redis not configured or unavailable — skip silently
  }
}

export async function getSecurityEvents(limit = 200): Promise<SecurityEvent[]> {
  try {
    const r = getRedis();
    const raw = await r.lrange(EVENTS_KEY, 0, limit - 1);
    return raw.map(item => (typeof item === 'string' ? JSON.parse(item) : item)) as SecurityEvent[];
  } catch {
    return [];
  }
}
