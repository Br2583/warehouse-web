'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';

export default function VaultRedirectPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    pb.collection('vaults').getOne(String(id), { fields: 'id,box_id,warehouse_id' })
      .then(vault => {
        router.replace(`/warehouses/${vault.warehouse_id}?vault=${vault.box_id}`);
      })
      .catch(() => {
        router.replace('/dashboard');
      });
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
