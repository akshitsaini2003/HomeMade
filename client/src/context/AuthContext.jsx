import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('hm_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  const setSession = (payload) => {
    localStorage.setItem('hm_access_token', payload.tokens.accessToken);
    localStorage.setItem('hm_refresh_token', payload.tokens.refreshToken);
    localStorage.setItem('hm_user', JSON.stringify(payload.user));
    setUser(payload.user);
  };

  const clearSession = () => {
    localStorage.removeItem('hm_access_token');
    localStorage.removeItem('hm_refresh_token');
    localStorage.removeItem('hm_user');
    setUser(null);
  };

  const register = async (input) => {
    const { data } = await client.post('/auth/register', input);
    toast.success(data.message);
    return data;
  };

  const verifyEmail = async (input) => {
    const { data } = await client.post('/auth/verify-email', input);
    toast.success(data.message);
    return data;
  };

  const resendVerification = async (email) => {
    const { data } = await client.post('/auth/resend-verification', { email });
    toast.success(data.message);
    return data;
  };

  const login = async (input) => {
    const { data } = await client.post('/auth/login', input);
    setSession(data.data);
    toast.success('Welcome back');
    return data.data.user;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('hm_refresh_token');
      if (refreshToken) {
        await client.post('/auth/logout', { refreshToken });
      }
    } catch (_error) {
      // no-op
    }
    clearSession();
    toast.info('Logged out');
  };

  const forgotPassword = async (email) => {
    const { data } = await client.post('/auth/forgot-password', { email });
    toast.success(data.message);
    return data;
  };

  const resetPassword = async (payload) => {
    const { data } = await client.post('/auth/reset-password', payload);
    toast.success(data.message);
    return data;
  };

  const refreshMe = async () => {
    try {
      const { data } = await client.get('/auth/me');
      localStorage.setItem('hm_user', JSON.stringify(data.data));
      setUser(data.data);
    } catch (_error) {
      clearSession();
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('hm_access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      await refreshMe();
      setLoading(false);
    };
    bootstrap();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      register,
      verifyEmail,
      resendVerification,
      login,
      logout,
      forgotPassword,
      resetPassword,
      refreshMe,
      setUser
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
