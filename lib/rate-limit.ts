import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

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

// Fail-open: si Upstash está caído, permite el request en vez de romper la app
export async function checkLimit(limiter: Ratelimit, key: string): Promise<boolean> {
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch {
    return true;
  }
}
