import { createHmac } from 'crypto';

const SECRET = process.env.JWT_SECRET!;

function toBase64(s: string) {
  return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function fromBase64(s: string) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
}
function hmac(data: string) {
  return createHmac('sha256', SECRET).update(data).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function signToken(payload: Record<string, unknown>, expiresInSec = 86400): string {
  const data = JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSec });
  const b64 = toBase64(data);
  return `${b64}.${hmac(b64)}`;
}

export function verifyToken(token: string): Record<string, unknown> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) throw new Error('Invalid token');
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sig !== hmac(b64)) throw new Error('Invalid token signature');
  const payload = JSON.parse(fromBase64(b64)) as Record<string, unknown>;
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}
