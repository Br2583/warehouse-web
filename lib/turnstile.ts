export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  if (!process.env.TURNSTILE_SECRET_KEY) return true; // dev: skip when not configured
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return true; // fail-open if Cloudflare is unreachable
  }
}
