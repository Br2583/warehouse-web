'use client';

import { createContext, useContext } from 'react';

interface NavData {
  unreadChat: number;
  pendingTasks: number;
}

export const NavDataContext = createContext<NavData>({ unreadChat: 0, pendingTasks: 0 });
export const useNavData = () => useContext(NavDataContext);
