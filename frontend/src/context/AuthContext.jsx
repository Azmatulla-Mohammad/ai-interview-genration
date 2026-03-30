import { createContext, useContext, useEffect, useState } from "react";

import { api } from "../lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "ai-interview-coach-token";
const USER_KEY = "ai-interview-coach-user";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadUser() {
      try {
        const profile = await api.me(token);
        if (!cancelled) {
          setUser(profile);
          localStorage.setItem(USER_KEY, JSON.stringify(profile));
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [token]);

  function persistSession(authPayload) {
    setToken(authPayload.access_token);
    setUser(authPayload.user);
    localStorage.setItem(TOKEN_KEY, authPayload.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(authPayload.user));
  }

  async function login(credentials) {
    const authPayload = await api.login(credentials);
    persistSession(authPayload);
    return authPayload;
  }

  async function register(values) {
    await api.register(values);
    return login({
      email: values.email,
      password: values.password,
    });
  }

  function logout() {
    setToken(null);
    setUser(null);
    setLoading(false);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token),
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
