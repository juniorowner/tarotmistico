import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchAdminOverview, type AdminOverviewResponse } from "@/lib/admin";

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleString("pt-BR");
}

const Admin = () => {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get("key") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [query, setQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  useEffect(() => {
    if (!adminKey) {
      setLoading(false);
      setError("Use /admin?key=SUA_CHAVE para acessar.");
      return;
    }
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const res = await fetchAdminOverview(adminKey);
        if (!active) return;
        setData(res);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar admin.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [adminKey]);

  const profileByUser = useMemo(() => {
    const m = new Map<string, AdminOverviewResponse["profiles"][number]>();
    for (const p of data?.profiles ?? []) m.set(p.id, p);
    return m;
  }, [data]);

  const latestPaidOrderByUser = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of data?.orders ?? []) {
      if (!o.user_id) continue;
      if (o.status !== "approved" && o.status !== "paid" && o.status !== "authorized") continue;
      if (!m.has(o.user_id)) m.set(o.user_id, o.id);
    }
    return m;
  }, [data]);

  const q = query.trim().toLowerCase();
  const usersFiltered = useMemo(() => {
    if (!data) return [];
    if (!q) return data.users;
    return data.users.filter((u) => (u.email || u.id).toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
  }, [data, q]);

  const ordersFiltered = useMemo(() => {
    if (!data) return [];
    return data.orders.filter((o) => {
      const byQuery =
        !q ||
        (o.email || o.user_id || "").toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.package_id.toLowerCase().includes(q);
      const byStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
      return byQuery && byStatus;
    });
  }, [data, q, orderStatusFilter]);

  const consultationsFiltered = useMemo(() => {
    if (!data) return [];
    if (!q) return data.consultations;
    return data.consultations.filter((c) =>
      [c.id, c.spread_name, c.email || "", c.user_id || ""].join(" ").toLowerCase().includes(q)
    );
  }, [data, q]);

  const uniqueOrderStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const o of data?.orders ?? []) set.add(o.status);
    return Array.from(set).sort();
  }, [data]);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl md:text-3xl text-primary tracking-wider uppercase">Admin</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            Voltar
          </Link>
        </div>

        {loading && <p className="text-sm text-muted-foreground">A carregar painel admin…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && data && (
          <>
            <section className="rounded-xl border border-border bg-card/40 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Cadastrados</p>
                  <p className="text-2xl font-display text-primary">{data.users.length}</p>
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-display text-primary">{data.orders.length}</p>
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Consultas</p>
                  <p className="text-2xl font-display text-primary">{data.consultations.length}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por e-mail, user_id, pedido, consulta..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Todos os status de pedido</option>
                  {uniqueOrderStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card/40 p-4">
              <h2 className="font-display text-sm uppercase tracking-wider text-primary mb-3">Cadastrados</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-3">E-mail</th>
                      <th className="py-2 pr-3">Créditos</th>
                      <th className="py-2 pr-3">Boas-vindas usada</th>
                      <th className="py-2 pr-3">Criado em</th>
                      <th className="py-2 pr-3">Último login</th>
                      <th className="py-2">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersFiltered.map((u) => {
                      const p = profileByUser.get(u.id);
                      return (
                        <tr key={u.id} className="border-b border-border/60">
                          <td className="py-2 pr-3">{u.email || u.id}</td>
                          <td className="py-2 pr-3">{p?.credits ?? "-"}</td>
                          <td className="py-2 pr-3">{p?.first_free_full_consult_used ? "Sim" : "Não"}</td>
                          <td className="py-2 pr-3">{fmtDate(u.created_at)}</td>
                          <td className="py-2 pr-3">{fmtDate(u.last_sign_in_at)}</td>
                          <td className="py-2">
                            <Link
                              to={`/admin/user/${u.id}?key=${encodeURIComponent(adminKey)}`}
                              className="text-primary hover:underline"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card/40 p-4">
              <h2 className="font-display text-sm uppercase tracking-wider text-primary mb-3">Pedidos (Pagamentos)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-3">Pedido</th>
                      <th className="py-2 pr-3">E-mail</th>
                      <th className="py-2 pr-3">Pacote</th>
                      <th className="py-2 pr-3">Créditos</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Criado</th>
                      <th className="py-2 pr-3">Pago</th>
                      <th className="py-2">Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersFiltered.map((o) => (
                      <tr key={o.id} id={`order-${o.id}`} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-mono text-xs">{o.id}</td>
                        <td className="py-2 pr-3">{o.email || o.user_id}</td>
                        <td className="py-2 pr-3">{o.package_id}</td>
                        <td className="py-2 pr-3">{o.credits}</td>
                        <td className="py-2 pr-3">{o.status}</td>
                        <td className="py-2 pr-3">{fmtDate(o.created_at)}</td>
                        <td className="py-2 pr-3">{fmtDate(o.paid_at)}</td>
                        <td className="py-2">
                          {o.user_id ? (
                            <Link
                              to={`/admin/user/${o.user_id}?key=${encodeURIComponent(adminKey)}`}
                              className="text-primary hover:underline"
                            >
                              Ver usuário
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card/40 p-4">
              <h2 className="font-display text-sm uppercase tracking-wider text-primary mb-3">Consultas</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-3">Consulta</th>
                      <th className="py-2 pr-3">E-mail</th>
                      <th className="py-2 pr-3">Tiragem</th>
                      <th className="py-2 pr-3">Pagou crédito</th>
                      <th className="py-2 pr-3">Boas-vindas IA</th>
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 pr-3">Pagamento</th>
                      <th className="py-2">Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultationsFiltered.map((c) => (
                      <tr key={c.id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-mono text-xs">{c.id}</td>
                        <td className="py-2 pr-3">{c.email || c.user_id}</td>
                        <td className="py-2 pr-3">{c.spread_name}</td>
                        <td className="py-2 pr-3">{c.used_credit ? "Sim" : "Não"}</td>
                        <td className="py-2 pr-3">{c.welcome_free_ai ? "Sim" : "Não"}</td>
                        <td className="py-2 pr-3">{fmtDate(c.created_at)}</td>
                        <td className="py-2 pr-3">
                          {c.used_credit && c.user_id && latestPaidOrderByUser.get(c.user_id) ? (
                            <a
                              href={`#order-${latestPaidOrderByUser.get(c.user_id)}`}
                              className="text-primary hover:underline"
                            >
                              Ir para pedido
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-2">
                          {c.user_id ? (
                            <Link
                              to={`/admin/user/${c.user_id}?key=${encodeURIComponent(adminKey)}`}
                              className="text-primary hover:underline"
                            >
                              Ver usuário
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
