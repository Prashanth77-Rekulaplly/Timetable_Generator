"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Role } from "./types";

interface AuthState {
  token: string | null;
  user: User | null;
  role: Role;
  login: (token: string, user: User, role: Role) => void;
  setUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      role: "admin",
      login: (token, user, role = "admin") => {
        set({ token, user, role });
      },
      setUser: (user) => {
        set({ user });
      },
      logout: () => {
        set({ token: null, user: null, role: "admin" });
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "timetable-auth",
    }
  )
);

// Helpers
export function authHeader(): { Authorization: string } | Record<string, never> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
