export function genCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function parseDate(s: string): Date {
  return new Date(s.replace(' ', 'T'));
}

export function parseDateOpt(s: string | undefined | null): Date | null {
  if (!s) return null;
  return new Date(s.replace(' ', 'T'));
}
