import {
  HomeIcon, BuildingOffice2Icon, ArchiveBoxIcon, ClipboardDocumentListIcon,
  MagnifyingGlassIcon, ChartBarSquareIcon, CameraIcon, ChatBubbleLeftRightIcon,
  Cog6ToothIcon, ClipboardDocumentCheckIcon, TrashIcon,
} from '@/components/icons';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconActive: React.ComponentType<{ className?: string }>;
  managerOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',      icon: HomeIcon,                   iconActive: HomeIcon },
  { href: '/warehouses', label: 'Warehouses',     icon: BuildingOffice2Icon,        iconActive: BuildingOffice2Icon },
  { href: '/storage',    label: 'Storage',        icon: ArchiveBoxIcon,             iconActive: ArchiveBoxIcon },
  { href: '/tasks',      label: 'Tasks',          icon: ClipboardDocumentListIcon,  iconActive: ClipboardDocumentListIcon },
  { href: '/search',     label: 'Search',         icon: MagnifyingGlassIcon,        iconActive: MagnifyingGlassIcon },
  { href: '/stats',      label: 'Stats',          icon: ChartBarSquareIcon,         iconActive: ChartBarSquareIcon },
  { href: '/snapshots',  label: 'Snapshots',      icon: CameraIcon,                 iconActive: CameraIcon },
  { href: '/chat',       label: 'Chat',           icon: ChatBubbleLeftRightIcon,    iconActive: ChatBubbleLeftRightIcon },
  { href: '/activity',   label: 'Activity',       icon: ClipboardDocumentCheckIcon, iconActive: ClipboardDocumentCheckIcon, managerOnly: true },
  { href: '/deleted',    label: 'Deleted Vaults', icon: TrashIcon,                  iconActive: TrashIcon, managerOnly: true },
  { href: '/settings',   label: 'Settings',       icon: Cog6ToothIcon,              iconActive: Cog6ToothIcon },
];
