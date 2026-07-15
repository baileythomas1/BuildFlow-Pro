"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

type Role = "OWNER" | "ADMIN" | "PM" | "EMPLOYEE" | "CLIENT";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  signup: (companyName: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseJson(res: Response) {
  return res.json().catch(() => ({}));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
    error: null,
  });

  // On mount, try to silently restore a session from the httpOnly refresh
  // cookie (if any) rather than requiring the user to log in every visit.
  useEffect(() => {
    (async () => {
      try {
        const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
        if (!refreshRes.ok) {
          setState({ user: null, accessToken: null, loading: false, error: null });
          return;
        }
        const { accessToken } = await refreshRes.json();

        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!meRes.ok) {
          setState({ user: null, accessToken: null, loading: false, error: null });
          return;
        }
        const { user } = await meRes.json();
        setState({ user, accessToken, loading: false, error: null });
      } catch {
        setState({ user: null, accessToken: null, loading: false, error: null });
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJson(res);
    if (!res.ok) {
      const message = data.error ?? "Login failed";
      setState((s) => ({ ...s, error: message }));
      throw new Error(message);
    }
    setState({ user: data.user, accessToken: data.accessToken, loading: false, error: null });
  }, []);

  const signup = useCallback(
    async (companyName: string, name: string, email: string, password: string) => {
      setState((s) => ({ ...s, error: null }));
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, name, email, password }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        const message = data.error ?? "Signup failed";
        setState((s) => ({ ...s, error: message }));
        throw new Error(message);
      }
      setState({ user: data.user, accessToken: data.accessToken, loading: false, error: null });
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ user: null, accessToken: null, loading: false, error: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
