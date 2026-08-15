/**
 * Custom icon library — Apple-style stroke icons (1.5px, round caps).
 * Drop-in replacement for @heroicons/react: same prop API, same export names.
 */
import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement>;

// Base wrapper — all icons share these defaults; consumers can override via props
function mk(body: React.ReactNode) {
  return function Icon({ width = 24, height = 24, ...p }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        width={width}
        height={height}
        {...p}
      >
        {body}
      </svg>
    );
  };
}

// ─── Pack icons (iconos-apple) ────────────────────────────────────────────────

export const HomeIcon = mk(<>
  <path d="M4.5 10.5 12 4l7.5 6.5"/>
  <path d="M6 9.2V19a1 1 0 0 0 1 1h3.4v-4.6a1.6 1.6 0 0 1 3.2 0V20H17a1 1 0 0 0 1-1V9.2"/>
</>);
export const HomeSolid = HomeIcon;

export const BuildingOffice2Icon = mk(<>
  <path d="M3.5 20V9.2L12 4l8.5 5.2V20"/>
  <path d="M7 20v-8h10v8"/>
  <path d="M7 15.5h10M10.5 12v8"/>
</>);
export const BuildingOffice2Solid = BuildingOffice2Icon;
export const BuildingOfficeIcon     = BuildingOffice2Icon;
export const BuildingStorefrontIcon = BuildingOffice2Icon;

export const ArchiveBoxIcon = mk(<>
  <path d="M3.8 8 12 3.8 20.2 8v8L12 20.2 3.8 16Z"/>
  <path d="M3.8 8 12 12l8.2-4M12 12v8.2"/>
  <path d="m7.9 6 8.2 4"/>
</>);
export const ArchiveSolid = ArchiveBoxIcon;

export const MagnifyingGlassIcon = mk(<>
  <circle cx="10.8" cy="10.8" r="6.3"/>
  <path d="m15.5 15.5 4.5 4.5"/>
</>);
export const SearchSolid = MagnifyingGlassIcon;

export const ClipboardDocumentListIcon = mk(<>
  <rect x="4" y="3.5" width="16" height="17" rx="2.2"/>
  <path d="m7.3 8.6 1.2 1.2 2.1-2.3M7.3 14.6l1.2 1.2 2.1-2.3M13.5 9h3.5M13.5 15h3.5"/>
</>);
export const TasksSolid                = ClipboardDocumentListIcon;
export const ClipboardDocumentCheckIcon = ClipboardDocumentListIcon;
export const ActivitySolid             = ClipboardDocumentListIcon;

export const ChartBarSquareIcon = mk(<>
  <path d="M4 4v14.5a1.5 1.5 0 0 0 1.5 1.5H20"/>
  <path d="M7.5 15.5v-4M11.5 15.5V8M15.5 15.5v-5.5M19.5 15.5V5.5"/>
</>);
export const ChartSolid  = ChartBarSquareIcon;
export const ChartBarIcon = ChartBarSquareIcon;

export const CameraIcon = mk(<>
  <path d="M8.2 6.5 9.4 4.6a1.3 1.3 0 0 1 1.1-.6h3a1.3 1.3 0 0 1 1.1.6l1.2 1.9h2.7A2.5 2.5 0 0 1 21 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5V9a2.5 2.5 0 0 1 2.5-2.5Z"/>
  <circle cx="12" cy="13" r="3.6"/>
</>);
export const CameraSolid = CameraIcon;

export const ChatBubbleLeftRightIcon = mk(<>
  <path d="M12 4a8.3 8.3 0 0 0-8.3 8.3c0 1.6.4 3 1.2 4.3L4 20l3.6-.9A8.3 8.3 0 1 0 12 4Z"/>
  <path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>
</>);
export const ChatSolid = ChatBubbleLeftRightIcon;

export const BellIcon = mk(<>
  <path d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4-1.3 5.6-2 6.4-.3.4 0 1 .5 1h14c.5 0 .8-.6.5-1-.7-.8-2-2.4-2-6.4A5.5 5.5 0 0 0 12 4Z"/>
  <path d="M10 19.8a2.1 2.1 0 0 0 4 0"/>
  <path d="M12 4V2.8"/>
</>);
export const BellSolid = BellIcon;

export const PencilSquareIcon = mk(<>
  <path d="m14.2 5.6 4.2 4.2L8.9 19.3l-4.6 1.1a.4.4 0 0 1-.5-.5l1.1-4.6Z"/>
  <path d="m16.1 3.7 1-1a1.6 1.6 0 0 1 2.3 0l1.9 1.9a1.6 1.6 0 0 1 0 2.3l-1 1"/>
</>);
export const PencilIcon = PencilSquareIcon;

export const TrashIcon = mk(<>
  <path d="M4.5 6.5h15M9.8 3.8h4.4M6.3 6.5l.9 12.4a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.9-12.4"/>
  <path d="M10 10.3v6.4M14 10.3v6.4"/>
</>);

export const PlusIcon = mk(<>
  <circle cx="12" cy="12" r="8.5"/>
  <path d="M12 8.2v7.6M8.2 12h7.6"/>
</>);
export const PlusCircleIcon = PlusIcon;

export const QrCodeIcon = mk(<>
  <path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16"/>
  <path d="M2.8 12h18.4"/>
  <rect x="7" y="6.8" width="3" height="3" rx=".6"/>
  <path d="M14 6.8h3v3M7 15.2h3M14 15.2h.01M17 15.2h.01M14 17.2h3"/>
</>);

export const TagIcon = mk(<>
  <path d="m12.6 3.6 7 .8.8 7a1.8 1.8 0 0 1-.5 1.5l-7.4 7.4a1.8 1.8 0 0 1-2.6 0l-5.2-5.2a1.8 1.8 0 0 1 0-2.6l7.4-7.4a1.8 1.8 0 0 1 1.5-.5Z"/>
  <circle cx="15.7" cy="8.3" r="1.2"/>
</>);
export const TicketIcon = TagIcon;

export const ArrowRightOnRectangleIcon = mk(<>
  <path d="M10.5 4H6.2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4.3"/>
  <path d="M9.5 12h11M17 8.5 20.5 12 17 15.5"/>
</>);

export const UserIcon = mk(<>
  <circle cx="12" cy="8.2" r="3.7"/>
  <path d="M5 20c.8-3.6 3.7-5.6 7-5.6s6.2 2 7 5.6"/>
</>);
export const UserCircleIcon = UserIcon;

export const UserPlusIcon = mk(<>
  <path d="M13.5 4H6.2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4.3"/>
  <path d="M9.5 12h10.7M17 8.5 20.5 12l-3.5 3.5"/>
</>);

export const Cog6ToothIcon = mk(<>
  <circle cx="12" cy="12" r="3.1"/>
  <path d="M12 3.2v2.1M12 18.7v2.1M20.8 12h-2.1M5.3 12H3.2M18.2 5.8l-1.5 1.5M7.3 16.7l-1.5 1.5M18.2 18.2l-1.5-1.5M7.3 7.3 5.8 5.8"/>
</>);
export const CogSolid              = Cog6ToothIcon;
export const CogIcon               = Cog6ToothIcon;
export const WrenchScrewdriverIcon = Cog6ToothIcon;
export const AdjustmentsHorizontalIcon = Cog6ToothIcon;

export const PaperAirplaneIcon = mk(<>
  <path d="M20.3 3.7 3.9 9.5c-.8.3-.8 1.4 0 1.7l6 2.2a1 1 0 0 1 .6.6l2.2 6c.3.8 1.4.8 1.7 0l5.8-16.4a.9.9 0 0 0-1.2-1.2z"/>
  <path d="m10.6 13.4 4.7-4.7"/>
</>);

export const EnvelopeIcon = mk(<>
  <rect x="3" y="5.5" width="18" height="13" rx="2.2"/>
  <path d="m4 7 7.2 5.6a1.3 1.3 0 0 0 1.6 0L20 7"/>
</>);

export const PhoneIcon = mk(<>
  <path d="M7.7 3.8 9 3.4c.7-.2 1.4.1 1.7.7l1.2 2.6c.3.6.1 1.3-.4 1.7l-1.3 1a12 12 0 0 0 4.4 4.4l1-1.3c.4-.5 1.1-.7 1.7-.4l2.6 1.2c.6.3.9 1 .7 1.7l-.4 1.3a2.4 2.4 0 0 1-2.8 1.7C11.9 16.9 7.1 12.1 6 5.6a2.4 2.4 0 0 1 1.7-1.8Z"/>
</>);
export const DevicePhoneMobileIcon = PhoneIcon;

export const TruckIcon = mk(<>
  <path d="M2.8 6.5h11.4v9.7H2.8z"/>
  <path d="M14.2 9.5h3.4l3 3.2v3.5h-6.4"/>
  <circle cx="6.9" cy="17.8" r="1.9"/>
  <circle cx="16.9" cy="17.8" r="1.9"/>
</>);

export const DocumentTextIcon = mk(<>
  <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/>
  <path d="M14 3.5v5h5M8.5 12.5h7M8.5 16h7"/>
</>);
export const DocumentDuplicateIcon = DocumentTextIcon;

export const ExclamationTriangleIcon = mk(<>
  <path d="M10.4 4.4c.7-1.2 2.5-1.2 3.2 0l7 12.4c.7 1.2-.2 2.7-1.6 2.7H5c-1.4 0-2.3-1.5-1.6-2.7Z"/>
  <path d="M12 9.2v4.4M12 16.7h.01"/>
</>);
export const ShieldExclamationIcon = ExclamationTriangleIcon;

export const HeartIcon = mk(<>
  <path d="M12 20s-7.8-4.9-7.8-10.3A4.6 4.6 0 0 1 8.8 5c1.4 0 2.6.7 3.2 1.9A3.7 3.7 0 0 1 15.2 5a4.6 4.6 0 0 1 4.6 4.7C19.8 15.1 12 20 12 20Z"/>
</>);

export const PlayIcon = mk(<>
  <path d="M7.5 5.3c0-.9 1-1.5 1.8-1L19 10.9c.8.5.8 1.7 0 2.2L9.3 19.7c-.8.5-1.8-.1-1.8-1Z"/>
</>);

export const PauseIcon = mk(<>
  <path d="M8.2 4.5v15M15.8 4.5v15"/>
</>);

export const ShareIcon = mk(<>
  <path d="M12 3.5v11M8.5 6.5 12 3l3.5 3.5"/>
  <path d="M7 10.5H6a1.8 1.8 0 0 0-1.8 1.8v6.4A1.8 1.8 0 0 0 6 20.5h12a1.8 1.8 0 0 0 1.8-1.8v-6.4A1.8 1.8 0 0 0 18 10.5h-1"/>
</>);
export const ArrowUpTrayIcon = ShareIcon;

export const ArrowDownTrayIcon = mk(<>
  <path d="M12 3.5v11M8.5 11.5 12 15l3.5-3.5"/>
  <path d="M4.2 15.5v3a2 2 0 0 0 2 2h11.6a2 2 0 0 0 2-2v-3"/>
</>);

export const ArrowPathIcon = mk(<>
  <path d="M12 20.5a8.5 8.5 0 1 0-8.4-9.7M3.5 6.5v4.3h4.3"/>
  <path d="M12 8v4.3l3 1.8"/>
</>);
export const ArrowUturnLeftIcon = ArrowPathIcon;
export const ClockIcon          = ArrowPathIcon;

export const BriefcaseIcon = mk(<>
  <rect x="4" y="13.5" width="7" height="7" rx="1.2"/>
  <rect x="13" y="13.5" width="7" height="7" rx="1.2"/>
  <rect x="8.5" y="4.5" width="7" height="7" rx="1.2"/>
</>);

export const MapPinIcon = mk(<>
  <path d="M12 3.5a6.6 6.6 0 0 1 6.6 6.6c0 4.4-4.6 8.6-6.1 9.9a.8.8 0 0 1-1 0c-1.5-1.3-6.1-5.5-6.1-9.9A6.6 6.6 0 0 1 12 3.5Z"/>
  <circle cx="12" cy="10" r="2.5"/>
</>);

export const PhotoIcon = mk(<>
  <rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/>
  <circle cx="8.6" cy="9.4" r="1.6"/>
  <path d="m3.5 16.5 4.6-4.3a1.5 1.5 0 0 1 2 0l5.4 5M14 15l2.2-2a1.5 1.5 0 0 1 2 0l2.3 2.1"/>
</>);

// ─── Custom SVGs (same style: 1.5 stroke, round caps) ────────────────────────

export const XMarkIcon = mk(<>
  <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5"/>
</>);

export const ArrowLeftIcon = mk(<>
  <path d="M20 12H4M10 6l-6 6 6 6"/>
</>);

export const CheckIcon = mk(<>
  <path d="M4.5 12.5 9.5 17.5 19.5 7"/>
</>);

export const CheckCircleIcon = mk(<>
  <circle cx="12" cy="12" r="8.5"/>
  <path d="m8.5 12 2.5 2.5 4.5-5"/>
</>);

export const XCircleIcon = mk(<>
  <circle cx="12" cy="12" r="8.5"/>
  <path d="m9.5 9.5 5 5M14.5 9.5l-5 5"/>
</>);

export const ExclamationCircleIcon = mk(<>
  <circle cx="12" cy="12" r="8.5"/>
  <path d="M12 8v4.5M12 15.5h.01"/>
</>);

export const Bars3Icon = mk(<>
  <path d="M4 6.5h16M4 12h16M4 17.5h16"/>
</>);

export const EyeIcon = mk(<>
  <path d="M2.4 12s3.6-6.5 9.6-6.5 9.6 6.5 9.6 6.5-3.6 6.5-9.6 6.5-9.6-6.5-9.6-6.5z"/>
  <circle cx="12" cy="12" r="2.5"/>
</>);

export const EyeSlashIcon = mk(<>
  <path d="M3.5 3.5 20.5 20.5"/>
  <path d="M10.5 5.7A9 9 0 0 1 12 5.5c6 0 9.6 6.5 9.6 6.5a16 16 0 0 1-2.2 3.1"/>
  <path d="M6.6 6.6A16 16 0 0 0 2.4 12s3.6 6.5 9.6 6.5a9 9 0 0 0 4.7-1.4"/>
  <circle cx="12" cy="12" r="2.5"/>
</>);

export const KeyIcon = mk(<>
  <circle cx="8.5" cy="14.5" r="4.5"/>
  <path d="m12.5 11 8.5-7.5M19 3.5V7M16.5 6.5h3"/>
</>);

export const LockClosedIcon = mk(<>
  <rect x="5" y="10.5" width="14" height="10" rx="2"/>
  <path d="M8 10.5V7a4 4 0 1 1 8 0v3.5"/>
</>);

export const InformationCircleIcon = mk(<>
  <circle cx="12" cy="12" r="8.5"/>
  <path d="M12 16v-4.5M12 8.5h.01"/>
</>);

export const ShieldCheckIcon = mk(<>
  <path d="M12 3.5c-2.5 1-5 2-7.5 2 0 5 2 9 7.5 11 5.5-2 7.5-6 7.5-11-2.5 0-5-1-7.5-2z"/>
  <path d="m9 12 2 2 4-4"/>
</>);

export const ChevronLeftIcon = mk(<>
  <path d="M15.5 18.5 9 12l6.5-6.5"/>
</>);

export const ChevronRightIcon = mk(<>
  <path d="M8.5 5.5 15 12l-6.5 6.5"/>
</>);

export const ListBulletIcon = mk(<>
  <path d="M9 6h11M9 12h11M9 18h11"/>
  <circle cx="4" cy="6" r="1"/>
  <circle cx="4" cy="12" r="1"/>
  <circle cx="4" cy="18" r="1"/>
</>);

export const Squares2X2Icon = mk(<>
  <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/>
  <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/>
  <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>
  <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>
</>);

export const ViewColumnsIcon = mk(<>
  <rect x="3.5" y="4.5" width="5" height="15" rx="1.5"/>
  <rect x="9.5" y="4.5" width="5" height="15" rx="1.5"/>
  <rect x="15.5" y="4.5" width="5" height="15" rx="1.5"/>
</>);

export const FunnelIcon = mk(<>
  <path d="M3.8 5.5h16.4l-6.5 8v5l-3.4-1.7V13.5z"/>
</>);

export const CalendarIcon = mk(<>
  <rect x="3.5" y="5" width="17" height="16" rx="2"/>
  <path d="M16 3.5v3M8 3.5v3M3.5 11h17"/>
</>);

export const ArrowTrendingUpIcon = mk(<>
  <path d="M3.5 16.5l5-6 4 3.5 7.5-9.5"/>
  <path d="M14.5 4.5H20V10"/>
</>);

export const ArrowsRightLeftIcon = mk(<>
  <path d="M4 8.5h16M16.5 5 20 8.5 16.5 12"/>
  <path d="M20 15.5H4M7.5 12 4 15.5 7.5 19"/>
</>);

export const ArrowUpIcon = mk(<>
  <path d="M12 20.5V3.5M5.5 10 12 3.5 18.5 10"/>
</>);

export const ArrowDownIcon = mk(<>
  <path d="M12 3.5v17M18.5 14 12 20.5 5.5 14"/>
</>);

export const CodeBracketIcon = mk(<>
  <path d="M8 7.5 3.5 12 8 16.5M16 7.5 20.5 12 16 16.5"/>
</>);

export const LifebuoyIcon = mk(<>
  <circle cx="12" cy="12" r="8.5"/>
  <circle cx="12" cy="12" r="3.5"/>
  <path d="m6.5 6.5 2.9 2.9M14.6 14.6l2.9 2.9M6.5 17.5l2.9-2.9M14.6 9.4l2.9-2.9"/>
</>);

export const PrinterIcon = mk(<>
  <path d="M7 8V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V8"/>
  <rect x="3.5" y="8" width="17" height="10" rx="1.5"/>
  <path d="M7 16h10v3.5H7z"/>
</>);

export const BoltIcon = mk(<>
  <path d="M13 3.5 7 12.5h8L9 20.5"/>
</>);

export const StarIcon = mk(<>
  <path d="M12 2.5l2.5 6.5h7L16 13l2 6.5L12 16 6 19.5l2-6.5L2.5 9h7z"/>
</>);

export const UserGroupIcon = mk(<>
  <circle cx="8" cy="8" r="3.5"/>
  <circle cx="16" cy="8" r="3.5"/>
  <path d="M1.5 19.5c.8-3.5 3.5-5.5 6.5-5.5s5.7 2 6.5 5.5"/>
  <path d="M15 14c2-.4 4.5.6 5.5 3.5"/>
</>);
export const UsersIcon = UserGroupIcon;

export const DocumentIcon = DocumentTextIcon;
export const LinkIcon = mk(<>
  <path d="M9.5 14.5a4 4 0 0 0 5.7 0l2.5-2.5a4 4 0 0 0-5.7-5.7L10.5 8"/>
  <path d="M14.5 9.5a4 4 0 0 0-5.7 0L6.3 12a4 4 0 0 0 5.7 5.7l1.5-1.5"/>
</>);
