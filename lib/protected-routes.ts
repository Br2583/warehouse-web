// Shared list of routes that require authentication.
// Used in both proxy.ts (Edge Runtime) and AppShell.tsx (client).
// Keep both consumers in sync by importing from here.
export const PROTECTED_ROUTES = [
  '/dashboard', '/warehouses', '/search', '/tasks',
  '/stats', '/snapshots', '/chat', '/profile',
  '/storage', '/onboarding', '/deleted', '/scan',
  '/vault', '/settings', '/activity',
] as const;
