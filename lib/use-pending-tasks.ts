'use client';

import { useEffect, useState, useCallback } from 'react';
import { getToken } from './api';

export function usePendingTasks(): number {
  const [count, setCount] = useState(0);

  const check = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const tasks: { status: string }[] = await res.json();
      setCount(tasks.filter(t => t.status !== 'DONE').length);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  return count;
}
