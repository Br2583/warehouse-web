'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from './pb';

export interface User {
  user_id: string;
  id: string;
  email: string;
  name: string;
  picture?: string;
  pin_changed?: boolean;
  company_id?: string;
  company_name?: string;
  company_approved?: boolean;
  company_suspended?: boolean;
  company_rejected?: boolean;
  role?: string;
  job_title?: string;
  profile_complete?: boolean;
}

interface AuthContextType {
  user: User | null;
  isOwner: boolean;
  isManager: boolean;
  canManage: boolean;
  loading: boolean;
  sessionExpired: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUserFromLogin: (user: User) => void;
  updatePicture: (picture: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function buildUser(model: any): Promise<User> {
  let company_name = '';
  let company_approved: boolean | undefined;
  let company_suspended: boolean | undefined;
  let company_rejected: boolean | undefined;
  if (model.company_id) {
    try {
      const c = await pb.collection('companies').getOne(model.company_id);
      company_name = c.name;
      company_approved  = c.approved  ?? false;
      company_suspended = c.suspended ?? false;
      company_rejected  = c.rejected  ?? false;
    } catch {}
  }
  // Use only avatar_base64 (TEXT/SQLite — persists on Railway; FILE field is ephemeral)
  const picture: string | undefined = model.avatar_base64 || undefined;

  return {
    user_id:           model.id,
    id:                model.id,
    email:             model.email,
    name:              model.name,
    picture,
    company_id:        model.company_id,
    company_name,
    company_approved,
    company_suspended,
    company_rejected,
    role:              model.role,
    pin_changed:       !!model.pin,
    job_title:         model.job_title,
    profile_complete:  !!model.profile_complete,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const buildGenRef = useRef(0);

  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model) {
      // Refresh token on load to extend its lifetime.
      // Retry once after 600ms — covers Android cold-start when network isn't ready yet.
      const tryRefresh = async (attempt = 0): Promise<void> => {
        try {
          await pb.collection('users').authRefresh();
          setUser(await buildUser(pb.authStore.model!));
        } catch {
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 600));
            return tryRefresh(1);
          }
          pb.authStore.clear();
          setUser(null);
          setSessionExpired(true);
        }
      };
      tryRefresh().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Subscribe to auth changes — generation counter discards stale concurrent calls
    const unsub = pb.authStore.onChange((_token, model) => {
      if (model) {
        const gen = ++buildGenRef.current;
        buildUser(model).then(u => { if (buildGenRef.current === gen) setUser(u); }).catch(() => setUser(null));
      } else {
        ++buildGenRef.current;
        setUser(null);
      }
    });

    // Auto-refresh every 6 hours to keep session alive
    const interval = setInterval(() => {
      if (pb.authStore.isValid) {
        pb.collection('users').authRefresh().catch(() => {});
      }
    }, 6 * 60 * 60 * 1000);

    return () => { unsub(); clearInterval(interval); };
  }, []);

  const refreshUser = async () => {
    try {
      await pb.collection('users').authRefresh();
      if (pb.authStore.model) {
        setUser(await buildUser(pb.authStore.model));
      }
    } catch {
      pb.authStore.clear();
      setUser(null);
    }
  };

  const logout = async () => {
    pb.authStore.clear();
    setUser(null);
    router.replace('/login');
  };

  const setUserFromLogin = (userData: User) => {
    setUser(userData);
    setSessionExpired(false);
  };

  const updatePicture = (picture: string) => {
    setUser(prev => prev ? { ...prev, picture } : prev);
  };

  const isOwner   = user?.role === 'owner';
  const isManager = user?.role === 'manager';
  const canManage = !!(isOwner || isManager);

  return (
    <AuthContext.Provider value={{ user, isOwner, isManager, canManage, loading, sessionExpired, logout, refreshUser, setUserFromLogin, updatePicture }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
