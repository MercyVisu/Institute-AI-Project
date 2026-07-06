export type UserRole = "SUPER_ADMIN" | "ADMIN" | "SUB_ADMIN" | "CLIENT_ADMIN" | "CLIENT_USER";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  tenant_id?: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  institution_type: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  is_active: boolean;
  max_documents: number;
  max_queries_per_day: number;
  created_at: string;
}

export interface Chatbot {
  id: string;
  tenant_id: string;
  name: string;
  welcome_message: string;
  placeholder_text: string;
  primary_color: string;
  position: string;
  avatar_url?: string;
  ai_tone: string;
  suggested_prompts: string[];
  enable_voice: boolean;
  enable_image: boolean;
  enable_tickets: boolean;
  enable_lead_capture: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  tenant_id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  category?: string;
  status: "pending" | "processing" | "completed" | "failed";
  chunk_count: number;
  error_message?: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  student_name?: string;
  student_email?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigned_to?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  course_interest?: string;
  message?: string;
  source: string;
  status: string;
  is_converted: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  max_documents: number;
  max_queries: number;
  max_users: number;
  is_active: boolean;
  starts_at: string;
  expires_at?: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  transaction_id?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  input_type?: string;
  sources?: { title: string; score: number }[];
  created_at: string;
}

export interface AnalyticsSummary {
  total_conversations: number;
  total_messages: number;
  total_documents: number;
  total_tickets: number;
  total_leads: number;
  avg_response_time: number;
  satisfaction_score: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface WidgetConfig {
  tenant_id: string;
  tenant_name: string;
  tenant_logo?: string;
  chatbot: {
    name: string;
    welcome_message: string;
    placeholder_text: string;
    primary_color: string;
    position: string;
    avatar_url?: string;
    suggested_prompts: string[];
    enable_voice: boolean;
    enable_image: boolean;
    enable_tickets: boolean;
    enable_lead_capture: boolean;
  };
}
