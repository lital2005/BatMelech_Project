import React, { createContext, useContext, useMemo, useState } from "react";
import { normalizeProfileImageUrl } from "../utils/assetUrl";

const AuthContext = createContext(null);

const STORAGE_KEY = "midrasha_auth_user";

function normalizeUser(user) {
  if (!user || typeof user !== "object") return user;
  const pi = user.profileImage;
  if (!pi || typeof pi !== "string") return user;
  return { ...user, profileImage: normalizeProfileImageUrl(pi) };
}

function readInitialUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeUser(parsed);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readInitialUser);

  const value = useMemo(() => {
    return {
      user,
      isLoggedIn: Boolean(user?._id),
      login: (safeUser) => {
        const normalized = normalizeUser(safeUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        setUser(normalized);
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

