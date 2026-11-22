import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as apiLogin, setAuthToken, setUnauthorizedHandler, type Role } from '../api';
import { AuthContext, type CurrentUser } from './authContext';

// sessionStorage: survives a page refresh, but is cleared when the tab is closed
const STORAGE_KEY = 'payrecon.user';

function loadUser(): CurrentUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as CurrentUser;
    return new Date(user.expiresAt) > new Date() ? user : null;   // ignore expired tokens
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(loadUser);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await apiLogin(username, password);
    const loggedIn: CurrentUser = {
      username: response.username,
      roles: response.roles,
      token: response.token,
      expiresAt: response.expiresAt,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedIn));
    setUser(loggedIn);
  }, []);

  // Keep api.ts in sync with the current token, and log out on any 401
  setAuthToken(user?.token ?? null);
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Log out automatically the moment the token expires
  useEffect(() => {
    if (!user) return;
    const msLeft = new Date(user.expiresAt).getTime() - Date.now();
    const timer = setTimeout(logout, Math.max(msLeft, 0));
    return () => clearTimeout(timer);          // cleanup: cancel the timer if user changes
  }, [user, logout]);

  const hasRole = useCallback(
    (...roles: Role[]) => !!user && user.roles.some(r => r === 'ADMIN' || roles.includes(r)),
    [user],
  );

  const value = useMemo(() => ({ user, login, logout, hasRole }), [user, login, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
