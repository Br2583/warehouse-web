import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, adminNewRequestEmail } from '@/lib/email';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

// 3 notifications per user per 24h
const _notifyLimit = new Map<string, { count: number; resetAt: number }>();
function checkNotifyLimit(userId: string): boolean {
  const now = Date.now();
  const entry = _notifyLimit.get(userId);
  if (!entry || now > entry.resetAt) {
    _notifyLimit.set(userId, { count: 1, resetAt: now + 86_400_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

async function getAuthenticatedUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const { record } = await res.json();
    return record as { id: string; name: string; email: string; company_id: string } | null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkNotifyLimit(user.id)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again tomorrow.' }, { status: 429 });
  }

  let companyName = '';
  if (user.company_id) {
    try {
      const adminToken = await getPbAdminToken();
      const cRes = await fetch(`${PB_URL}/api/collections/companies/records/${user.company_id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (cRes.ok) companyName = (await cRes.json()).name || '';
    } catch {}
  }
  if (!companyName) {
    const body = await req.json().catch(() => ({}));
    companyName = (body as any).companyName || 'Unknown';
  }

  const email = adminNewRequestEmail(companyName, user.name || user.email, user.email);
  await sendEmail({ to: ADMIN_EMAIL, toName: process.env.ADMIN_NAME || 'Admin', ...email });

  return NextResponse.json({ ok: true });
}
