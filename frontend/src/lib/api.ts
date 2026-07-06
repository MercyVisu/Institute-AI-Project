import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const tenantId = Cookies.get("tenant_id");
    if (tenantId) {
      config.headers["X-Tenant-ID"] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          Cookies.set("access_token", data.access_token, { sameSite: "Lax" });
          Cookies.set("refresh_token", data.refresh_token, { sameSite: "Lax" });

          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          Cookies.remove("tenant_id");
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
