import React, { createContext, useContext, useEffect, useState } from 'react';
import { setAuthTokenGetter, login as loginApi, getCurrentSession, logout as logoutApi, deleteStaffPushToken } from '@workspace/api-client-react';
import { router, useSegments } from 'expo-router';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../lib/secureStorage';
import { getPushTokenId, clearPushStorage } from '../lib/pushStorage';

// The User type expected from the backend
type User = { id: string; role: string; firstName: string; lastName: string; email: string };

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'jiggling_pig_access_token';
const REFRESH_TOKEN_KEY = 'jiggling_pig_refresh_token';

// This configures the API client to use the token for all requests
setAuthTokenGetter(async () => {
  return getSecureItem(TOKEN_KEY);
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();

  useEffect(() => {
    async function loadUser() {
      try {
        const token = await getSecureItem(TOKEN_KEY);
        if (token) {
          const res = await getCurrentSession();
          if (res.data.role === 'admin') {
            setUser(res.data as any); // Cast as User since schema might differ slightly
          } else {
            await logout(); // Not authorized
          }
        }
      } catch (err) {
        console.error('Failed to load user', err);
        await deleteSecureItem(TOKEN_KEY);
        await deleteSecureItem(REFRESH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  const login = async (email: string, pass: string) => {
    const res = await loginApi({ emailAddress: email, password: pass });
    if (res.data) {
      await setSecureItem(TOKEN_KEY, res.data.accessToken);
      await setSecureItem(REFRESH_TOKEN_KEY, res.data.refreshToken);

      const sessionRes = await getCurrentSession();
      if (sessionRes.data.role !== 'admin') {
        await deleteSecureItem(TOKEN_KEY);
        await deleteSecureItem(REFRESH_TOKEN_KEY);
        throw new Error('Not authorized. Admin role required.');
      }
      setUser(sessionRes.data as any);
    }
  };

  const logout = async () => {
    try {
      const pushTokenId = await getPushTokenId();
      if (pushTokenId) {
        await deleteStaffPushToken(pushTokenId);
        await clearPushStorage();
      }
    } catch (e: any) {
      throw new Error('Failed to revoke push notifications. Disable notifications in settings or try again.');
    }

    try {
      const refreshToken = await getSecureItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await logoutApi({ refreshToken }).catch(() => {});
      }
    } finally {
      await deleteSecureItem(TOKEN_KEY);
      await deleteSecureItem(REFRESH_TOKEN_KEY);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
