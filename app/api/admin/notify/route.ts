import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, adminNewRequestEmail } from '@/lib/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

export async function POST(req: NextRequest) {
  const { companyName, ownerName, ownerEmail } = await req.json();
  if (!companyName || !ownerName || !ownerEmail) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const email = adminNewRequestEmail(companyName, ownerName, ownerEmail);
  await sendEmail({ to: ADMIN_EMAIL, toName: 'Brayan', ...email });

  return NextResponse.json({ ok: true });
}
