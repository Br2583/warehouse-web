// Box / furniture inventory counts, shared by vaults and storage units.
// Stored as a single JSON field `item_counts`. Art and Wardrobe are box types,
// so they roll into the box total; Furniture is counted on its own.

export const COUNT_FIELDS = ['small', 'medium', 'large', 'art', 'wardrobe', 'furniture'] as const;
export type CountKey = typeof COUNT_FIELDS[number];
export type ItemCounts = Partial<Record<CountKey, number>>;

export const COUNT_LABELS: Record<CountKey, string> = {
  small:     'Small',
  medium:    'Medium',
  large:     'Large',
  art:       'Art',
  wardrobe:  'Wardrobe',
  furniture: 'Furniture',
};

// Everything except furniture is a box (Art and Wardrobe are box types).
export const BOX_KEYS: CountKey[] = ['small', 'medium', 'large', 'art', 'wardrobe'];

const n = (v: unknown) => {
  const x = Math.floor(Number(v));
  return Number.isFinite(x) && x > 0 ? x : 0;
};

/** Normalizes any stored shape (JSON string, object, null) into an ItemCounts. */
export function parseCounts(raw: unknown): ItemCounts {
  let obj: any = raw;
  if (typeof raw === 'string') { try { obj = JSON.parse(raw); } catch { obj = {}; } }
  if (!obj || typeof obj !== 'object') return {};
  const out: ItemCounts = {};
  for (const k of COUNT_FIELDS) { const v = n(obj[k]); if (v) out[k] = v; }
  return out;
}

export function countTotals(c?: ItemCounts) {
  const counts = c || {};
  const boxes = BOX_KEYS.reduce((s, k) => s + n(counts[k]), 0);
  const furniture = n(counts.furniture);
  return { boxes, furniture, total: boxes + furniture };
}

export function hasCounts(c?: ItemCounts): boolean {
  return countTotals(c).total > 0;
}
