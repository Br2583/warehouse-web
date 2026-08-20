import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logSecurityEvent, SecurityEventType } from '@/lib/security-events';

const redis = Redis.fromEnv();

export const emailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'rl:email',
});

export const adminLoginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '30 s'),
  prefix: 'rl:admin-login',
});

export const notifyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '24 h'),
  prefix: 'rl:notify',
});

export const joinRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'rl:join',
});

export const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:chat',
});

// In-memory fallback for when Upstash is unavailable (single-instance protection only)
const _fallback = new Map<string, { count: number; resetAt: number }>();
function _checkFallback(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (_fallback.size > 500) {
    for (const [k, v] of _fallback) { if (now > v.resetAt) _fallback.delete(k); }
  }
  const entry = _fallback.get(key);
  if (!entry || now > entry.resetAt) {
    _fallback.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// Fail-open: si Upstash está caído, usa fallback in-memory si se provee (para rutas críticas)
// o permite el request (fail-open) para rutas no críticas
export async function checkLimit(
  limiter: Ratelimit,
  key: string,
  fallbackMax?: number,
  fallbackWindowMs?: number,
  logAs?: { type: SecurityEventType; ip: string },
): Promise<boolean> {
  try {
    const { success } = await limiter.limit(key);
    if (!success && logAs) {
      logSecurityEvent({ type: logAs.type, ip: logAs.ip, detail: `Rate limit hit — key: ${key.slice(0, 60)}`, ts: Date.now() });
    }
    return success;
  } catch {
    if (fallbackMax !== undefined && fallbackWindowMs !== undefined) {
      return _checkFallback(key, fallbackMax, fallbackWindowMs);
    }
    return true; // fail-open para rutas no críticas
  }
}

// Token dedup via Redis SET NX — previene replay cross-process.
// Returns 'new' (token ok, now marked), 'used' (reject), 'unknown' (Redis down, use PB check as fallback).
export async function dedupToken(
  tokenId: string,
  ttlSec: number,
): Promise<'new' | 'used' | 'unknown'> {
  try {
    const key = `token-used:${tokenId.slice(0, 64)}`;
    const result = await redis.set(key, '1', { nx: true, ex: Math.max(ttlSec, 1) });
    return result === 'OK' ? 'new' : 'used';
  } catch {
    return 'unknown'; // Redis no disponible — el PB timestamp check sigue protegiendo
  }
}
