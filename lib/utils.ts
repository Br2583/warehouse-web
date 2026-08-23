export function genCode(): string {
  const arr = new Uint8Array(6);
  (globalThis.crypto || crypto).getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').substring(0, 8).toUpperCase();
}

export function parseDate(s: string): Date {
  return new Date(s.replace(' ', 'T'));
}

export function parseDateOpt(s: string | undefined | null): Date | null {
  if (!s) return null;
  return new Date(s.replace(' ', 'T'));
}

export function timeAgo(ts: string): string {
  const date = new Date(ts.replace(' ', 'T'));
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
