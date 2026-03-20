import React, { createContext, useContext, useMemo, useState } from 'react';
import client from '../api/client';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [tomorrowMenu, setTomorrowMenu] = useState(null);

  const loadNotificationCount = async () => {
    try {
      const { data } = await client.get('/notifications?limit=1');
      setNotificationCount(data.data.unreadCount || 0);
    } catch (_error) {
      setNotificationCount(0);
    }
  };

  const loadTomorrowMenu = async () => {
    try {
      const { data } = await client.get('/menus/tomorrow');
      setTomorrowMenu(data.data);
      return data.data;
    } catch (_error) {
      setTomorrowMenu(null);
      return null;
    }
  };

  const value = useMemo(
    () => ({
      notificationCount,
      setNotificationCount,
      loadNotificationCount,
      tomorrowMenu,
      setTomorrowMenu,
      loadTomorrowMenu
    }),
    [notificationCount, tomorrowMenu]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
