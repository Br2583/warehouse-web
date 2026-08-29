'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';
import { sf } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function VaultRedirectPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!id || !user?.company_id) return;
    pb.collection('vaults').getFirstListItem(
      `id="${sf(String(id))}" && company_id="${sf(user.company_id)}" && deleted_at = ""`,
      { fields: 'id,warehouse_id' }
    )
      .then(vault => {
        router.replace(`/warehouses/${vault.warehouse_id}?vault=${vault.id}&t=${Date.now()}`);
      })
      .catch(() => {
        router.replace('/dashboard');
      });
  }, [id, router, user?.company_id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
