'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Profile was merged into Settings — it duplicated the member list and role
 * controls, and split team management across two screens (invite codes lived
 * in Settings, the members they created lived here). Kept as a redirect so
 * bookmarks and the Android shell's older links still land somewhere useful.
 */
export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
