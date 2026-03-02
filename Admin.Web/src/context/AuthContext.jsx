import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import {
  apiGet,
  apiPost,
  saveTokens,
  clearTokens,
  getAccessToken,
} from '@/utils/apiClient';

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const accessToken = getAccessToken();
    const user = (() => {
      try { return JSON.parse(localStorage.getItem('authUser') || 'null'); }
      catch { return null; }
    })();
    return { accessToken, user, isAuthenticated: !!accessToken };
  });

  // ── helpers ────────────────────────────────────────────────────────────────
  const fetchAndStoreProfile = useCallback(async (userId, accessToken) => {
    try {
      const profileRes = await apiGet('/users/me');
      const p = profileRes?.data ?? {};
      const user = {
        userId,
        firstName: p.firstName ?? null,
        lastName: p.lastName ?? null,
        emailAddress: p.emailAddress ?? null,
        role: p.role ?? null,
      };
      localStorage.setItem('authUser', JSON.stringify(user));
      setAuth((prev) => ({ ...prev, accessToken, user, isAuthenticated: true }));
      return user;
    } catch {
      // Profile fetch failed — store minimal user
      const user = { userId };
      localStorage.setItem('authUser', JSON.stringify(user));
      setAuth((prev) => ({ ...prev, accessToken, user, isAuthenticated: true }));
      return user;
    }
  }, []);

  // ── Backfill profile on startup for existing sessions ──────────────────────
  useEffect(() => {
    if (auth.isAuthenticated && !auth.user?.emailAddress) {
      fetchAndStoreProfile(auth.user?.userId, auth.accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (emailAddress, password) => {
    const res = await apiPost('/auth/login', { emailAddress, password });
    const { accessToken, refreshToken, userId } = res.data;
    saveTokens({ accessToken, refreshToken });
    await fetchAndStoreProfile(userId, accessToken);
    return res;
  }, [fetchAndStoreProfile]);

  // ── register ───────────────────────────────────────────────────────────────
  const register = useCallback(async ({ firstName, lastName, emailAddress, password, phoneNumber }) => {
    const res = await apiPost('/auth/register', { firstName, lastName, emailAddress, password, phoneNumber });
    const { accessToken, refreshToken, userId } = res.data;
    saveTokens({ accessToken, refreshToken });
    await fetchAndStoreProfile(userId, accessToken);
    return res;
  }, [fetchAndStoreProfile]);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) await apiPost('/auth/logout', { refreshToken });
    } catch { /* ignore */ }
    clearTokens();
    setAuth({ accessToken: null, user: null, isAuthenticated: false });
  }, []);

  // ── forgotPassword ─────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (emailAddress) => {
    return await apiPost('/auth/forgot-password', { emailAddress });
  }, []);

  // ── resetPassword ──────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (token, password) => {
    return await apiPost('/auth/reset-password', { token, password });
  }, []);

  // ── refreshProfile ─────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (auth.user?.userId) {
      await fetchAndStoreProfile(auth.user.userId, auth.accessToken);
    }
  }, [auth.user, auth.accessToken, fetchAndStoreProfile]);

  return (
    <AuthContext.Provider value={{ ...auth, login, register, logout, forgotPassword, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ─── PrivateRoute ──────────────────────────────────────────────────────────────
// Wrap authenticated route groups with this — redirects to login if not authed.

export function PrivateRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth-login" replace />;
}

