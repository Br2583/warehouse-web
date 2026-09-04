import {
  HomeIcon, BuildingOffice2Icon, ArchiveBoxIcon, ClipboardDocumentListIcon,
  MagnifyingGlassIcon, ChartBarSquareIcon, CameraIcon, ChatBubbleLeftRightIcon,
  Cog6ToothIcon, ClipboardDocumentCheckIcon,
} from '@/components/icons';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  managerOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',  icon: HomeIcon },
  { href: '/warehouses', label: 'Warehouses', icon: BuildingOffice2Icon },
  { href: '/storage',    label: 'Storage',    icon: ArchiveBoxIcon },
  { href: '/tasks',      label: 'Tasks',      icon: ClipboardDocumentListIcon },
  { href: '/search',     label: 'Search',     icon: MagnifyingGlassIcon },
  { href: '/stats',      label: 'Stats',      icon: ChartBarSquareIcon, managerOnly: true },
  { href: '/snapshots',  label: 'Snapshots',  icon: CameraIcon },
  { href: '/chat',       label: 'Chat',       icon: ChatBubbleLeftRightIcon },
  { href: '/activity',   label: 'Activity',   icon: ClipboardDocumentCheckIcon, managerOnly: true },
  { href: '/settings',   label: 'Settings',   icon: Cog6ToothIcon },
];
