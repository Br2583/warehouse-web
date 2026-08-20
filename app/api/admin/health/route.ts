import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { PB_URL } from '@/lib/pb-admin';
import { Redis } from '@upstash/redis';
import { sendEmail } from '@/lib/email';

const HISTORY_KEY = 'health:history';
const CONSEC_KEY  = 'health:consecutive_failures';
const COOLDOWN_KEY = 'health:alert_cooldown';
const MAX_HISTORY = 48;

interface ServiceStatus { ok: boolean; ms: number }
interface HealthCheck {
  ts: number;
  pb: ServiceStatus;
  redis: ServiceStatus;
  brevo: ServiceStatus;
  allOk: boolean;
}

async function pingPocketBase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`${PB_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

async function pingRedis(r: Redis): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const result = await Promise.race([
      r.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    return { ok: result === 'PONG', ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

async function pingBrevo(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': process.env.BREVO_API_KEY || '' },
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let redis: Redis | null = null;
  try { redis = Redis.fromEnv(); } catch {}

  const [pb, redisStatus, brevo] = await Promise.all([
    pingPocketBase(),
    redis ? pingRedis(redis) : Promise.resolve<ServiceStatus>({ ok: false, ms: 0 }),
    pingBrevo(),
  ]);

  const allOk = pb.ok && redisStatus.ok && brevo.ok;
  const ts = Date.now();
  const check: HealthCheck = { ts, pb, redis: redisStatus, brevo, allOk };

  let history: HealthCheck[] = [];
  let uptime: number | null = null;

  if (redis) {
    try {
      await redis.lpush(HISTORY_KEY, JSON.stringify(check));
      await redis.ltrim(HISTORY_KEY, 0, MAX_HISTORY - 1);
      await redis.expire(HISTORY_KEY, 60 * 60 * 24 * 7);

      const raw = await redis.lrange(HISTORY_KEY, 0, MAX_HISTORY - 1);
      history = raw.map(item => (typeof item === 'string' ? JSON.parse(item) : item)) as HealthCheck[];
      uptime = history.length > 0
        ? Math.round((history.filter(h => h.allOk).length / history.length) * 100)
        : null;

      if (!allOk) {
        const failures = await redis.incr(CONSEC_KEY);
        await redis.expire(CONSEC_KEY, 3600);
        if (failures >= 3) {
          const cooldown = await redis.get(COOLDOWN_KEY);
          if (!cooldown) {
            const alertEmail = process.env.ADMIN_ALERT_EMAIL || process.env.BREVO_SENDER_EMAIL;
            if (alertEmail) {
              const failing = [
                !pb.ok && 'PocketBase',
                !redisStatus.ok && 'Redis (Upstash)',
                !brevo.ok && 'Brevo (email)',
              ].filter(Boolean).join(', ');
              sendEmail({
                to: alertEmail,
                subject: 'Warehouse Manager — Service Alert',
                html: `<p><strong>Services down:</strong> ${failing}</p><p><strong>Time:</strong> ${new Date(ts).toUTCString()}</p><p>Check the admin panel for details.</p>`,
              }).catch(() => {});
              await redis.set(COOLDOWN_KEY, '1', { ex: 3600 });
            }
          }
        }
      } else {
        await redis.del(CONSEC_KEY).catch(() => {});
      }
    } catch {}
  }

  return NextResponse.json({ pb, redis: redisStatus, brevo, allOk, uptime, historyCount: history.length, history: history.slice(0, 24), ts });
}
