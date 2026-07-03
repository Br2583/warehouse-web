export const AVATARS = [
  { id: 'briefcase', color: '#2563eb', label: 'Manager' },
  { id: 'building',  color: '#7c3aed', label: 'Director' },
  { id: 'star',      color: '#b45309', label: 'Lead' },
  { id: 'chart',     color: '#0891b2', label: 'Analyst' },
  { id: 'wrench',    color: '#4f46e5', label: 'Technician' },
  { id: 'box',       color: '#059669', label: 'Warehouse' },
  { id: 'truck',     color: '#ea580c', label: 'Driver' },
  { id: 'cog',       color: '#475569', label: 'Operations' },
  { id: 'users',     color: '#0f766e', label: 'Team' },
  { id: 'shield',    color: '#65a30d', label: 'Security' },
  { id: 'clipboard', color: '#9333ea', label: 'Admin' },
  { id: 'bolt',      color: '#d97706', label: 'Express' },
] as const;

export type AvatarId = typeof AVATARS[number]['id'];

export function getAvatarById(value?: string | null) {
  if (!value?.startsWith('avatar:')) return null;
  const id = value.slice(7);
  return AVATARS.find(a => a.id === id) ?? null;
}
