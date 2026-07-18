import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, adminNewRequestEmail } from '@/lib/email';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

// Verify the caller is a real authenticated PocketBase user
async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return false;
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyName, ownerName, ownerEmail } = await req.json();
  if (!companyName || !ownerName || !ownerEmail) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const email = adminNewRequestEmail(companyName, ownerName, ownerEmail);
  await sendEmail({ to: ADMIN_EMAIL, toName: process.env.ADMIN_NAME || 'Admin', ...email });

  return NextResponse.json({ ok: true });
}
