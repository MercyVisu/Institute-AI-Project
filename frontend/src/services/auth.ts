import api from "@/lib/api";
import { AuthTokens, User, UserRole } from "@/types";

export const authService = {
  login: async (email: string, password: string): Promise<AuthTokens> => {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await api.post("/auth/refresh", { refresh_token: refreshToken });
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  },

  getProfile: async (): Promise<User> => {
    const { data } = await api.get("/users/me");
    return data;
  },

  updateProfile: async (updates: Partial<User>): Promise<User> => {
    const { data } = await api.put("/users/me", updates);
    return data;
  },
};
