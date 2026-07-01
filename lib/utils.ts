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
