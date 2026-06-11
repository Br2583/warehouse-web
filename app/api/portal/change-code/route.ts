import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

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
