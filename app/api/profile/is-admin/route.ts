import { NextRequest, NextResponse } from 'next/server';
import { PB_URL } from '@/lib/pb-admin';

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ isAdmin: false });

  const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return NextResponse.json({ isAdmin: false });

  const { record } = await res.json();
  const adminEmail = process.env.ADMIN_USER_EMAIL;
  return NextResponse.json({ isAdmin: !!adminEmail && record?.email === adminEmail });
}
