import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext({ user: null, loading: true, refresh: () => {}, logout: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // NOTE: the session cookie is HttpOnly by design (XSS protection), so it is
  // never visible to document.cookie — there is no reliable client-side way to
  // "skip the network call when logged out". Always ask the backend; a missing/
  // invalid cookie just comes back as 401, which we treat as logged out.
  const refresh = useCallback(async () => {
    try {
      const r = await api.get("/auth/me", { timeout: 8000 });
      setUser(r.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("logout failed (network) — clearing local state anyway", err);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
