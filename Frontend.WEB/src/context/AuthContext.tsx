"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as authApi from "@/lib/auth";

interface User {
  id: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  [key: string]: unknown;
}

interface RegisterData {
  emailAddress: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailAddress: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEYS = {
  access: "jpig_access_token",
  refresh: "jpig_refresh_token",
  userId: "jpig_user_id",
} as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
    localStorage.removeItem(TOKEN_KEYS.userId);
  }, []);

  const storeTokens = useCallback((tokens: { accessToken: string; refreshToken: string; userId: string }) => {
    localStorage.setItem(TOKEN_KEYS.access, tokens.accessToken);
    localStorage.setItem(TOKEN_KEYS.refresh, tokens.refreshToken);
    localStorage.setItem(TOKEN_KEYS.userId, tokens.userId);
  }, []);

  const fetchUser = useCallback(async (accessToken: string) => {
    try {
      const me = await authApi.getMe(accessToken) as User;
      setUser(me);
    } catch {
      const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
      if (refreshToken) {
        try {
          const newTokens = await authApi.refreshAccessToken(refreshToken);
          if (newTokens.accessToken) {
            storeTokens(newTokens);
            const me = await authApi.getMe(newTokens.accessToken) as User;
            setUser(me);
            return;
          }
        } catch {
          // refresh also failed
        }
      }
      clearTokens();
      setUser(null);
    }
  }, [clearTokens, storeTokens]);

  useEffect(() => {
    const accessToken = localStorage.getItem(TOKEN_KEYS.access);
    if (accessToken) {
      fetchUser(accessToken).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback(async (emailAddress: string, password: string) => {
    const tokens = await authApi.login(emailAddress, password);
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error("Login failed — no tokens received");
    }
    storeTokens(tokens);
    await fetchUser(tokens.accessToken);
  }, [storeTokens, fetchUser]);

  const register = useCallback(async (data: RegisterData) => {
    const tokens = await authApi.register(data);
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error("Registration failed — no tokens received");
    }
    storeTokens(tokens);
    await fetchUser(tokens.accessToken);
  }, [storeTokens, fetchUser]);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore logout API errors
      }
    }
    clearTokens();
    setUser(null);
  }, [clearTokens]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
