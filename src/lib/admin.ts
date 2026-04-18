import { supabase } from "@/integrations/supabase/client";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

export interface AdminUser {
  id: string;
  email: string;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface AdminProfile {
  id: string;
  credits: number;
  first_free_full_consult_used: boolean;
  created_at: string;
}

export interface AdminOrder {
  id: string;
  user_id?: string;
  email?: string;
  package_id: string;
  credits: number;
  amount_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  mp_payment_id?: string | null;
}

export interface AdminConsultation {
  id: string;
  user_id?: string;
  email?: string;
  spread_id: string;
  spread_name: string;
  used_credit: boolean;
  welcome_free_ai: boolean;
  revoked_at: string | null;
  created_at: string;
}

/** Log de consultas anónimas (tabela guest_questions). */
export interface AdminGuestLog {
  id: string;
  spread_name: string;
  question: string | null;
  model_used: string | null;
  created_at: string;
  interpretation_preview: string;
}

/** Perguntas / interpretações IA de utilizadores logados (ai_readings). */
export interface AdminAiQuestionLog {
  id: string;
  user_id: string | null;
  email: string;
  question: string | null;
  spread_name: string;
  model_used: string | null;
  created_at: string;
  interpretation_preview: string;
}

/** Sessão de rastreio de funil (visitor_sessions). */
export interface AdminVisitorSession {
  id: string;
  visitor_client_id: string;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
  entry_path: string | null;
  referrer: string | null;
  user_agent: string | null;
  language: string | null;
  is_authenticated: boolean;
  auth_user_id: string | null;
  screen_w: number | null;
  screen_h: number | null;
  viewport_w: number | null;
  viewport_h: number | null;
}

export interface AdminVisitorEvent {
  id: number;
  recorded_at: string;
  event_type: string;
  payload: Record<string, unknown>;
}

export interface AdminVisitorSessionDetailResponse {
  session: AdminVisitorSession & Record<string, unknown>;
  events: AdminVisitorEvent[];
  event_count: number;
}

export interface AdminOverviewResponse {
  users: AdminUser[];
  profiles: AdminProfile[];
  orders: AdminOrder[];
  consultations: AdminConsultation[];
  /** Presente após deploy de admin-overview com guest_questions. */
  guest_logs?: AdminGuestLog[];
  guest_logs_total?: number;
  /** Últimas interpretações IA (pergunta + prévia), tabela ai_readings. */
  ai_question_logs?: AdminAiQuestionLog[];
  ai_question_logs_total?: number;
  /** Últimas sessões de rastreio (migration visitor_analytics). */
  visitor_sessions?: AdminVisitorSession[];
}

export interface AdminUserDetailResponse {
  user: AdminUser;
  profile: AdminProfile | null;
  orders: AdminOrder[];
  consultations: AdminConsultation[];
}

function toAdminErrorMessage(error: unknown): string {
  if (error instanceof FunctionsHttpError) {
    return "A função admin respondeu com erro (HTTP). Verifique a chave e os logs da função.";
  }
  if (error instanceof FunctionsFetchError) {
    return "Falha de rede ao chamar a função admin. Verifique deploy/URL do Supabase.";
  }
  if (error instanceof FunctionsRelayError) {
    return "Serviço de funções indisponível no momento. Tente novamente.";
  }
  if (error instanceof Error) return error.message;
  return "Falha ao carregar dados do admin.";
}

export async function fetchAdminOverview(adminKey: string): Promise<AdminOverviewResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-overview", {
      headers: { "x-admin-key": adminKey },
    });
    if (error) throw error;
    return data as AdminOverviewResponse;
  } catch (error) {
    throw new Error(toAdminErrorMessage(error));
  }
}

export async function fetchAdminUserDetail(
  adminKey: string,
  userId: string
): Promise<AdminUserDetailResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-user-detail", {
      headers: { "x-admin-key": adminKey },
      body: { user_id: userId },
    });
    if (error) throw error;
    return data as AdminUserDetailResponse;
  } catch (error) {
    throw new Error(toAdminErrorMessage(error));
  }
}

export async function fetchAdminVisitorSessionDetail(
  adminKey: string,
  sessionId: string
): Promise<AdminVisitorSessionDetailResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-visitor-session", {
      headers: { "x-admin-key": adminKey },
      body: { session_id: sessionId },
    });
    if (error) throw error;
    return data as AdminVisitorSessionDetailResponse;
  } catch (error) {
    throw new Error(toAdminErrorMessage(error));
  }
}
