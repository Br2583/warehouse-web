'use client';

import { useState } from 'react';
import {
  BriefcaseIcon, BuildingOffice2Icon, StarIcon, ChartBarIcon,
  WrenchScrewdriverIcon, ArchiveBoxIcon, TruckIcon, CogIcon,
  UsersIcon, ShieldCheckIcon, ClipboardDocumentListIcon, BoltIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid';
import { getAvatarById } from '@/lib/avatars';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  briefcase: BriefcaseIcon,
  building:  BuildingOffice2Icon,
  star:      StarIcon,
  chart:     ChartBarIcon,
  wrench:    WrenchScrewdriverIcon,
  box:       ArchiveBoxIcon,
  truck:     TruckIcon,
  cog:       CogIcon,
  users:     UsersIcon,
  shield:    ShieldCheckIcon,
  clipboard: ClipboardDocumentListIcon,
  bolt:      BoltIcon,
};

interface Props {
  picture?: string | null;
  name?: string | null;
  size?: number;
  shape?: 'circle' | 'square';
  className?: string;
}

export function UserAvatar({ picture, name, size = 36, shape = 'circle', className = '' }: Props) {
  const rounded = shape === 'square' ? 'rounded-2xl' : 'rounded-full';
  const style = { width: size, height: size, minWidth: size };
  const iconSize = Math.round(size * 0.52);
  const [imgError, setImgError] = useState(false);

  const av = getAvatarById(picture);
  if (av) {
    const Icon = ICON_MAP[av.id] ?? UserCircleIcon;
    return (
      <div
        style={{ ...style, background: av.color }}
        className={`flex items-center justify-center flex-shrink-0 ${rounded} ${className}`}
      >
        <Icon style={{ width: iconSize, height: iconSize }} className="text-white" />
      </div>
    );
  }

  if (!imgError && (picture?.startsWith('data:image') || picture?.startsWith('http'))) {
    return (
      <img
        src={picture}
        alt={name ?? ''}
        style={style}
        className={`object-cover flex-shrink-0 ${rounded} ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  const letter = (name ?? '?')[0].toUpperCase();
  return (
    <div
      style={style}
      className={`bg-blue-100 flex items-center justify-center flex-shrink-0 ${rounded} ${className}`}
    >
      <span className="font-bold text-blue-600" style={{ fontSize: Math.round(size * 0.42) }}>
        {letter}
      </span>
    </div>
  );
}
