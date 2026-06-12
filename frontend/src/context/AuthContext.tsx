import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, type AuthUser } from '../api/client';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, githubLogin?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.auth.me()
      .then((u) => setUser(u))
      .catch(() => { localStorage.removeItem('auth_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(email: string, password: string) {
    const { token: t, user: u } = await api.auth.login(email, password);
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser(u);
  }

  async function register(email: string, password: string, githubLogin?: string) {
    const { token: t, user: u } = await api.auth.register({ email, password, githubLogin });
    localStorage.setItem('auth_token', t);
    setToken(t);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
