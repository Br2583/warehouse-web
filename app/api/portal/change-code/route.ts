import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PB_URL = 'https://pocketbase-production-e699.up.railway.app';

function getPortalCode(): string {
  try {
    const { code } = JSON.parse(readFileSync(join(process.cwd(), 'data', 'portal-code.json'), 'utf-8'));
    if (code && typeof code === 'string') return code;
  } catch {
    // fall through to env var
  }
  return process.env.PORTAL_CODE ?? '';
}

function setPortalCode(newCode: string) {
  const dir = join(process.cwd(), 'data');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'portal-code.json'), JSON.stringify({ code: newCode }), 'utf-8');
}

export async function POST(req: NextRequest) {
  // Verify caller is an owner via PocketBase token
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const pbRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
    method: 'POST',
    headers: { Authorization: authHeader },
  }).catch(() => null);
  if (!pbRes?.ok) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const { record } = await pbRes.json();
  if (record?.role !== 'owner') {
    return NextResponse.json({ error: 'Owner role required.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.current !== 'string' || typeof body.newCode !== 'string') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { current, newCode } = body;

  if (!current || !newCode) {
    return NextResponse.json({ error: 'Both current and new codes are required.' }, { status: 400 });
  }

  if (newCode.length < 4) {
    return NextResponse.json({ error: 'New code must be at least 4 characters.' }, { status: 400 });
  }

  const correctCode = getPortalCode();
  if (!correctCode) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  if (current !== correctCode) {
    return NextResponse.json({ error: 'Current code is incorrect.' }, { status: 401 });
  }

  setPortalCode(newCode);
  return NextResponse.json({ success: true });
}
