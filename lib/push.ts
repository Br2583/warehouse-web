/**
 * Server-side FCM push notification sender (legacy HTTP API).
 * Requires FCM_SERVER_KEY in .env.local (from Firebase Console > Project Settings > Cloud Messaging).
 *
 * Called from API routes when events occur (task assigned, chat message, etc.)
 */

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

export interface PushPayload {
  title: string;
  body: string;
  route?: string;        // Deep link — e.g. "/tasks", "/chat"
  tag?: string;          // Collapse key (only show latest notification of same tag)
}

/**
 * Send a push notification to one or more device tokens.
 * Silently swallows errors so it never breaks the main API response.
 */
export async function sendPush(tokens: string[], payload: PushPayload): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey || tokens.length === 0) return;

  const notification = {
    title: payload.title,
    body: payload.body,
    sound: 'default',
  };

  const data: Record<string, string> = {};
  if (payload.route) data.route = payload.route;

  const body = tokens.length === 1
    ? { to: tokens[0], notification, data, android: { priority: 'high' } }
    : { registration_ids: tokens, notification, data, android: { priority: 'high' }, collapse_key: payload.tag };

  try {
    await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Push failures should never break main API
  }
}

/**
 * Get all FCM tokens for a user (they might have multiple devices).
 * Looks up the device_tokens collection in PocketBase.
 */
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

/**
 * Get all FCM tokens for a company (for broadcast notifications).
 */
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
