import { PB_URL } from './pb-admin';

/**
 * Recomputes a vault's workflow status (estado) from the tasks linked to it.
 *
 * Rules (Feature #1):
 *  - A vault with at least one open (non-DONE) task is PENDING.
 *  - A vault whose tasks are ALL done becomes READY.
 *  - A vault manually marked DELIVERED is never touched — a delivered vault stays
 *    delivered regardless of task churn.
 *  - A vault with no linked tasks is left exactly as it is.
 *
 * Runs server-side with the admin token (the tasks collection is admin-only) and
 * never throws: a sync failure must not break the task operation that triggered it.
 */
export async function syncVaultStatus(
  vaultId: string | undefined | null,
  companyId: string,
  adminToken: string,
): Promise<void> {
  if (!vaultId) return;
  try {
    const vRes = await fetch(`${PB_URL}/api/collections/vaults/records/${vaultId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!vRes.ok) return;
    const vault = await vRes.json();
    if (vault.company_id !== companyId) return;
    if (vault.estado === 'DELIVERED') return; // manual delivered wins, always

    const filter = encodeURIComponent(`company_id="${companyId}" && vault_id="${vaultId}"`);
    const tRes = await fetch(
      `${PB_URL}/api/collections/tasks/records?filter=${filter}&perPage=500&fields=id,status`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const tData = tRes.ok ? await tRes.json() : { items: [] };
    const tasks: { status: string }[] = tData.items || [];
    if (tasks.length === 0) return; // no tasks: leave the vault untouched

    const nextEstado = tasks.every(t => t.status === 'DONE') ? 'READY' : 'PENDING';
    if (nextEstado !== vault.estado) {
      await fetch(`${PB_URL}/api/collections/vaults/records/${vaultId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nextEstado }),
      });
    }
  } catch {
    /* sync must never break the task operation */
  }
}
