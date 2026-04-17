import { supabase } from "@/integrations/supabase/client";

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

export interface AdminOverviewResponse {
  users: AdminUser[];
  profiles: AdminProfile[];
  orders: AdminOrder[];
  consultations: AdminConsultation[];
}

export interface AdminUserDetailResponse {
  user: AdminUser;
  profile: AdminProfile | null;
  orders: AdminOrder[];
  consultations: AdminConsultation[];
}

export async function fetchAdminOverview(adminKey: string): Promise<AdminOverviewResponse> {
  const { data, error } = await supabase.functions.invoke("admin-overview", {
    headers: { "x-admin-key": adminKey },
  });
  if (error) throw new Error(error.message || "Falha ao carregar painel admin.");
  return data as AdminOverviewResponse;
}

export async function fetchAdminUserDetail(
  adminKey: string,
  userId: string
): Promise<AdminUserDetailResponse> {
  const { data, error } = await supabase.functions.invoke("admin-user-detail", {
    headers: { "x-admin-key": adminKey },
    body: { user_id: userId },
  });
  if (error) throw new Error(error.message || "Falha ao carregar detalhe do utilizador.");
  return data as AdminUserDetailResponse;
}
