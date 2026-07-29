import { GoogleAuth } from 'google-auth-library';

const FCM_V1_URL = 'https://fcm.googleapis.com/v1/projects/warehouse-manager-e09dc/messages:send';

export interface PushPayload {
  title: string;
  body: string;
  route?: string;
  tag?: string;
}

let _cachedToken: { value: string; expiresAt: number } | null = null;

async function getFCMAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now < _cachedToken.expiresAt) return _cachedToken.value;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');

  const credentials = JSON.parse(raw);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) throw new Error('Failed to obtain FCM access token');

  // Cache for 50 minutes (tokens last 60 min)
  _cachedToken = { value: token, expiresAt: now + 50 * 60 * 1000 };
  return token;
}

async function deleteStaleToken(token: string, pbUrl: string, adminToken: string) {
  try {
    const safeToken = token.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const res = await fetch(
      `${pbUrl}/api/collections/device_tokens/records?filter=${encodeURIComponent(`token="${safeToken}"`)}&perPage=1`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (!res.ok) return;
    const data = await res.json();
    for (const record of data.items || []) {
      await fetch(`${pbUrl}/api/collections/device_tokens/records/${record.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  } catch { /* best effort */ }
}

export async function sendPush(
  tokens: string[],
  payload: PushPayload,
  pbUrl?: string,
  adminToken?: string
): Promise<void> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || tokens.length === 0) return;
  try {
    const accessToken = await getFCMAccessToken();
    const sends = tokens.map(async token => {
      try {
        const res = await fetch(FCM_V1_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: payload.title, body: payload.body },
              data: payload.route ? { route: payload.route } : {},
              android: { priority: 'high', notification: { sound: 'default', channel_id: 'warehouse-high', notification_priority: 'PRIORITY_MAX', visibility: 'PUBLIC' } },
            },
          }),
        });
        if (!res.ok && pbUrl && adminToken) {
          const err = await res.json().catch(() => ({}));
          const code = err?.error?.details?.[0]?.errorCode;
          if (code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT') {
            // Token is stale — remove it so the app re-registers on next open
            await deleteStaleToken(token, pbUrl, adminToken);
          }
        }
      } catch { /* ignore individual send failures */ }
    });
    await Promise.all(sends);
  } catch {
    // Push failures never break the main API response
  }
}

export async function getTokensForUser(
  userId: string,
  adminToken: string,
  pbUrl: string
): Promise<string[]> {
  try {
    const res = await fetch(
      `${pbUrl}/api/collections/device_tokens/records?filter=${encodeURIComponent(`user_id="${userId}"`)}&perPage=10`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((r: { token: string }) => r.token).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getTokensForCompany(
  companyId: string,
  excludeUserId: string,
  adminToken: string,
  pbUrl: string
): Promise<string[]> {
  try {
    const filter = `company_id="${companyId}" && user_id!="${excludeUserId}"`;
    const res = await fetch(
      `${pbUrl}/api/collections/device_tokens/records?filter=${encodeURIComponent(filter)}&perPage=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((r: { token: string }) => r.token).filter(Boolean);
  } catch {
    return [];
  }
}
