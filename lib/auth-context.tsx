'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, removeToken, setToken } from './api';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  pin_changed?: boolean;
  company_id?: string;
  company_name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUserFromLogin: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.get('/api/auth/me')
        .then(setUser)
        .catch(() => removeToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data);
    } catch {
      removeToken();
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {}
    removeToken();
    setUser(null);
    window.location.href = '/login';
  };

  const setUserFromLogin = (userData: User, token: string) => {
    setToken(token);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, setUserFromLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
