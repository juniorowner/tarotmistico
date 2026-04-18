import type { User } from "@supabase/supabase-js";

/** Nome definido pelo utilizador (ou vindo do Google etc.), excluindo fallback do e-mail. */
export function readDisplayNameFromUser(user: User | null): string | null {
  if (!user) return null;
  const m = user.user_metadata as Record<string, unknown>;
  const raw = m.display_name ?? m.full_name ?? m.name;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

/** Nome para cumprimentos na UI: preferência pelo nome; senão a parte local do e-mail. */
export function friendlyNameFromUser(user: User | null): string {
  if (!user) return "";
  const dn = readDisplayNameFromUser(user);
  if (dn) return dn;
  return user.email?.split("@")[0] ?? "Conta";
}
