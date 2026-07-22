import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/tokens';
import { getPbAdminToken, PB_URL } from '@/lib/pb-admin';

const usedTokens = new Map<string, number>();

function markTokenUsed(token: string, expSec: number) {
  usedTokens.set(token, expSec * 1000);
  const now = Date.now();
  for (const [t, exp] of usedTokens) {
    if (now > exp) usedTokens.delete(t);
  }
}

function isTokenUsed(token: string): boolean {
  const exp = usedTokens.get(token);
  if (exp === undefined) return false;
  if (Date.now() > exp) { usedTokens.delete(token); return false; }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

    if (isTokenUsed(token)) return NextResponse.json({ error: 'This activation link has already been used.' }, { status: 400 });

    const payload = verifyToken(token);
    if (payload.purpose !== 'activate' || !payload.companyId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const adminToken = await getPbAdminToken();
    const res = await fetch(`${PB_URL}/api/collections/companies/records/${payload.companyId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true, suspended: false, rejected: false }),
    });

    if (!res.ok) return NextResponse.json({ error: 'No se pudo activar la empresa' }, { status: 500 });
    markTokenUsed(token, payload.exp as number);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error al activar' }, { status: 400 });
  }
}
