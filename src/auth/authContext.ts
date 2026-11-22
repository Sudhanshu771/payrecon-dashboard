import { createContext, useContext } from 'react';
import type { Role } from '../api';

// Who is logged in. Kept in a React "context" so ANY component can read it without passing props down.
export type CurrentUser = {
  username: string;
  roles: Role[];
  token: string;
  expiresAt: string;
};

export type AuthState = {
  user: CurrentUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
};

export const AuthContext = createContext<AuthState | null>(null);

// A custom hook: const { user, logout } = useAuth();
export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return auth;
}
