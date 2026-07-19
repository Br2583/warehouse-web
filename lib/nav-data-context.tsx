'use client';

import { createContext, useContext } from 'react';

interface NavData {
  unreadChat: number;
  pendingTasks: number;
  chatPreview: string | null;
  chatSender: string | null;
  firstTaskTitle: string | null;
}

export const NavDataContext = createContext<NavData>({
  unreadChat: 0, pendingTasks: 0, chatPreview: null, chatSender: null, firstTaskTitle: null,
});
export const useNavData = () => useContext(NavDataContext);
