import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";
import Cookies from "js-cookie";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setAuth: (user, accessToken, refreshToken) => {
        Cookies.set("access_token", accessToken, { sameSite: "Lax" });
        Cookies.set("refresh_token", refreshToken, { sameSite: "Lax" });
        if (user.tenant_id) {
          Cookies.set("tenant_id", user.tenant_id, { sameSite: "Lax" });
        }
        set({ user, isAuthenticated: true });
      },
      logout: () => {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        Cookies.remove("tenant_id");
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: "eduai-auth",
    }
  )
);

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setMobileOpen: (open) => set({ isMobileOpen: open }),
}));

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggle: () =>
        set((state) => {
          const newDark = !state.isDark;
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", newDark);
          }
          return { isDark: newDark };
        }),
    }),
    { name: "eduai-theme" }
  )
);
