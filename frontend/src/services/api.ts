import api from "@/lib/api";
import { Tenant, User, Document, Ticket, Lead, Subscription, Payment, Chatbot, AnalyticsSummary, PaginatedResponse } from "@/types";

// Tenant Service
export const tenantService = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Tenant>> => {
    const { data } = await api.get("/tenants", { params });
    return data;
  },
  get: async (id: string): Promise<Tenant> => {
    const { data } = await api.get(`/tenants/${id}`);
    return data;
  },
  create: async (tenant: Partial<Tenant>): Promise<Tenant> => {
    const { data } = await api.post("/tenants", tenant);
    return data;
  },
  update: async (id: string, tenant: Partial<Tenant>): Promise<Tenant> => {
    const { data } = await api.put(`/tenants/${id}`, tenant);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/tenants/${id}`);
    return data;
  },
};

// User Service
export const userService = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<User>> => {
    const { data } = await api.get("/users", { params });
    return data;
  },
  get: async (id: string): Promise<User> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },
  create: async (user: Record<string, unknown>): Promise<User> => {
    const { data } = await api.post("/users", user);
    return data;
  },
  update: async (id: string, user: Partial<User>): Promise<User> => {
    const { data } = await api.put(`/users/${id}`, user);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },
};

// Document / Training Service
export const trainingService = {
  uploadDocument: async (file: File, title?: string, category?: string, tenantId?: string): Promise<Document> => {
    const formData = new FormData();
    formData.append("file", file);
    const params = new URLSearchParams();
    if (title) params.append("title", title);
    if (category) params.append("category", category);
    if (tenantId) params.append("tenant_id", tenantId);
    const { data } = await api.post(`/training/upload?${params.toString()}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  listDocuments: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Document>> => {
    const { data } = await api.get("/training/documents", { params });
    return data;
  },
  getDocument: async (id: string): Promise<Document> => {
    const { data } = await api.get(`/training/documents/${id}`);
    return data;
  },
  deleteDocument: async (id: string) => {
    const { data } = await api.delete(`/training/documents/${id}`);
    return data;
  },
  retrainDocument: async (id: string) => {
    const { data } = await api.post(`/training/documents/${id}/retrain`);
    return data;
  },
};

// Chatbot Service
export const chatbotService = {
  getConfig: async (): Promise<Chatbot> => {
    const { data } = await api.get("/chatbot/config");
    return data;
  },
  createConfig: async (config: Partial<Chatbot>): Promise<Chatbot> => {
    const { data } = await api.post("/chatbot/config", config);
    return data;
  },
  updateConfig: async (config: Partial<Chatbot>): Promise<Chatbot> => {
    const { data } = await api.put("/chatbot/config", config);
    return data;
  },
  chat: async (message: string, tenantId: string, sessionId?: string) => {
    const { data } = await api.post(`/chatbot/chat?tenant_id=${tenantId}`, {
      message,
      session_id: sessionId,
    });
    return data;
  },
};

// Ticket Service
export const ticketService = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Ticket>> => {
    const { data } = await api.get("/tickets", { params });
    return data;
  },
  get: async (id: string): Promise<Ticket> => {
    const { data } = await api.get(`/tickets/${id}`);
    return data;
  },
  create: async (ticket: Partial<Ticket>, tenantId: string): Promise<Ticket> => {
    const { data } = await api.post(`/tickets?tenant_id=${tenantId}`, ticket);
    return data;
  },
  update: async (id: string, ticket: Partial<Ticket>): Promise<Ticket> => {
    const { data } = await api.put(`/tickets/${id}`, ticket);
    return data;
  },
  getReplies: async (id: string) => {
    const { data } = await api.get(`/tickets/${id}/replies`);
    return data;
  },
  addReply: async (id: string, message: string, isInternal: boolean = false) => {
    const { data } = await api.post(`/tickets/${id}/replies`, { message, is_internal: isInternal });
    return data;
  },
};

// Lead Service
export const leadService = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Lead>> => {
    const { data } = await api.get("/leads", { params });
    return data;
  },
  get: async (id: string): Promise<Lead> => {
    const { data } = await api.get(`/leads/${id}`);
    return data;
  },
  capture: async (lead: Partial<Lead>, tenantId: string): Promise<Lead> => {
    const { data } = await api.post(`/leads?tenant_id=${tenantId}`, lead);
    return data;
  },
  update: async (id: string, lead: Partial<Lead>): Promise<Lead> => {
    const { data } = await api.put(`/leads/${id}`, lead);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/leads/${id}`);
    return data;
  },
};

// Analytics Service
export const analyticsService = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    const { data } = await api.get("/analytics/summary");
    return data;
  },
  getDailyConversations: async (days: number = 30) => {
    const { data } = await api.get(`/analytics/conversations/daily?days=${days}`);
    return data;
  },
  getDailyMessages: async (days: number = 30) => {
    const { data } = await api.get(`/analytics/messages/daily?days=${days}`);
    return data;
  },
  getSuperAdminOverview: async () => {
    const { data } = await api.get("/analytics/super-admin/overview");
    return data;
  },
};

// Payment Service
export const paymentService = {
  getSubscription: async (): Promise<Subscription> => {
    const { data } = await api.get("/payments/subscription");
    return data;
  },
  subscribe: async (plan: Record<string, unknown>) => {
    const { data } = await api.post("/payments/subscribe", plan);
    return data;
  },
  getHistory: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Payment>> => {
    const { data } = await api.get("/payments/history", { params });
    return data;
  },
  getAllPayments: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Payment>> => {
    const { data } = await api.get("/payments/all", { params });
    return data;
  },
};

// Widget Service
export const widgetService = {
  getConfig: async (slug: string) => {
    const { data } = await api.get(`/widget/config/${slug}`);
    return data;
  },
  getEmbedCode: async (slug: string) => {
    const { data } = await api.get(`/widget/embed-code/${slug}`);
    return data;
  },
};
