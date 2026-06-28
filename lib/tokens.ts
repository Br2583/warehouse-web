import { createHmac } from 'crypto';

const SECRET = process.env.JWT_SECRET!;

export function signToken(payload: Record<string, unknown>, expiresInSec = 86400): string {
  const data = JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSec });
  const b64 = Buffer.from(data).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifyToken(token: string): Record<string, unknown> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) throw new Error('Invalid token');
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = createHmac('sha256', SECRET).update(b64).digest('base64url');
  if (sig !== expectedSig) throw new Error('Invalid token signature');
  const payload = JSON.parse(Buffer.from(b64, 'base64url').toString()) as Record<string, unknown>;
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}
