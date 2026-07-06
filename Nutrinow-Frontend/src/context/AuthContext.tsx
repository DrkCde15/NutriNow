import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import { getUser, setUser as storageSetUser, setToken as storageSetToken, clearLocalSession, apiRequest, type User } from '../api/client';

interface AuthState {
  user: User | null;
  loading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; user: User | null }
  | { type: 'MERGE_USER'; updates: Partial<User> }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; loading: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user, loading: false };
    case 'MERGE_USER':
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...action.updates } };
    case 'LOGOUT':
      return { user: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
  }
}

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshMe: () => Promise<void>;
  isPremium: boolean;
  isProfessional: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, loading: true });

  useEffect(() => {
    const stored = getUser();
    dispatch({ type: 'SET_USER', user: stored });
  }, []);

  const login = useCallback((token: string, userData: User) => {
    storageSetToken(token);
    storageSetUser(userData);
    dispatch({ type: 'SET_USER', user: userData });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/logout', { method: 'POST' });
    } catch { /* ignore */ }
    clearLocalSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    dispatch({ type: 'MERGE_USER', updates });
  }, []);

  // Sync storage after each state change
  useEffect(() => {
    if (state.user) storageSetUser(state.user);
  }, [state.user]);

  const refreshMe = useCallback(async () => {
    try {
      const data = await apiRequest<User>('/me');
      if (data) {
        dispatch({ type: 'SET_USER', user: { ...state.user, ...data } as User });
      }
    } catch { /* ignore */ }
  }, [state.user]);

  const isPremium = !!state.user && (!!state.user.is_premium || !!state.user.premium || state.user.plan === 'premium');
  const isProfessional = state.user?.role === 'nutritionist' || state.user?.role === 'personal_trainer';

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, refreshMe, isPremium, isProfessional }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
