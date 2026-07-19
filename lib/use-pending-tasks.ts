'use client';

import { useEffect, useState, useCallback } from 'react';
import { getToken } from './api';

export interface PendingTasksData {
  count: number;
  firstTitle: string | null;
}

export function usePendingTasks(): PendingTasksData {
  const [data, setData] = useState<PendingTasksData>({ count: 0, firstTitle: null });

  const check = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const tasks: { status: string; title?: string }[] = await res.json();
      const pending = tasks.filter(t => t.status === 'PENDING');
      setData({
        count: pending.length,
        firstTitle: pending[0]?.title?.slice(0, 60) || null,
      });
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  return data;
}
