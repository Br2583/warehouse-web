'use client';

import { COUNT_FIELDS, COUNT_LABELS, countTotals, hasCounts, type ItemCounts, type CountKey } from '@/lib/item-counts';

/** Free-number inputs for the six item categories, with live totals. */
export function ItemCountsInput({ value, onChange }: {
  value: ItemCounts;
  onChange: (v: ItemCounts) => void;
}) {
  const set = (k: CountKey, raw: string) => {
    const next = { ...value };
    const num = Math.max(0, Math.floor(Number(raw)));
    if (!raw || !Number.isFinite(num) || num <= 0) delete next[k];
    else next[k] = num;
    onChange(next);
  };
  const t = countTotals(value);

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {COUNT_FIELDS.map(k => (
          <div key={k} className="flex items-center justify-between gap-2">
            <label htmlFor={`count-${k}`} className="text-sm text-gray-600">{COUNT_LABELS[k]}</label>
            <input
              id={`count-${k}`}
              type="number"
              inputMode="numeric"
              min={0}
              value={value[k] ?? ''}
              onChange={e => set(k, e.target.value)}
              placeholder="0"
              className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
        <span className="text-gray-500">Total Boxes <span className="font-semibold text-gray-800">{t.boxes}</span></span>
        <span className="text-gray-500">Furniture <span className="font-semibold text-gray-800">{t.furniture}</span></span>
        <span className="text-gray-500">Total <span className="font-semibold text-gray-900">{t.total}</span></span>
      </div>
    </div>
  );
}

/** Read-only summary of the counts. `compact` fits inside a list card. */
export function ItemCountsSummary({ value, compact = false }: {
  value?: ItemCounts;
  compact?: boolean;
}) {
  if (!hasCounts(value)) return null;
  const t = countTotals(value);
  if (compact) {
    return (
      <span className="text-xs text-gray-500">
        {t.boxes > 0 && <>{t.boxes} {t.boxes === 1 ? 'box' : 'boxes'}</>}
        {t.boxes > 0 && t.furniture > 0 && ' · '}
        {t.furniture > 0 && <>{t.furniture} furniture</>}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span className="text-gray-500">Total Boxes <span className="font-semibold text-gray-800">{t.boxes}</span></span>
      <span className="text-gray-500">Furniture <span className="font-semibold text-gray-800">{t.furniture}</span></span>
      <span className="text-gray-500">Total <span className="font-semibold text-gray-900">{t.total}</span></span>
    </div>
  );
}
