import {
  PlusCircleIcon, PencilSquareIcon, TrashIcon,
  ArrowPathIcon, ArrowsRightLeftIcon,
} from '@/components/icons';

export const ACTION_CONFIG: Record<string, { color: string; bg: string; label: string; Icon: any }> = {
  CREATED:  { color: 'text-green-700',  bg: 'bg-green-100',  label: 'created',  Icon: PlusCircleIcon },
  EDITED:   { color: 'text-blue-700',   bg: 'bg-blue-100',   label: 'edited',   Icon: PencilSquareIcon },
  DELETED:  { color: 'text-red-700',    bg: 'bg-red-100',    label: 'deleted',  Icon: TrashIcon },
  RESTORED: { color: 'text-amber-700',  bg: 'bg-amber-100',  label: 'restored', Icon: ArrowPathIcon },
  MOVED:    { color: 'text-purple-700', bg: 'bg-purple-100', label: 'moved',    Icon: ArrowsRightLeftIcon },
};
