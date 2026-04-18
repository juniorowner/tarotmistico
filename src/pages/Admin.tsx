import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchAdminOverview,
  fetchAdminVisitorSessionDetail,
  type AdminOverviewResponse,
  type AdminVisitorSessionDetailResponse,
} from "@/lib/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [funnelSessionId, setFunnelSessionId] = useState<string | null>(null);
  const [funnelDetail, setFunnelDetail] = useState<AdminVisitorSessionDetailResponse | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelError, setFunnelError] = useState<string | null>(null);

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

  const guestLogsFiltered = useMemo(() => {
    const rows = data?.guest_logs ?? [];
    if (!q) return rows;
    return rows.filter((g) =>
      [g.spread_name, g.question || "", g.interpretation_preview]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, q]);

  const aiQuestionLogsFiltered = useMemo(() => {
    const rows = data?.ai_question_logs ?? [];
    if (!q) return rows;
    return rows.filter((r) =>
      [r.spread_name, r.question || "", r.email, r.user_id || "", r.interpretation_preview]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, q]);

  const visitorSessionsFiltered = useMemo(() => {
    const rows = data?.visitor_sessions ?? [];
    if (!q) return rows;
    return rows.filter((s) =>
      [s.id, s.visitor_client_id, s.entry_path || "", s.referrer || "", s.user_agent || ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, q]);

  useEffect(() => {
    if (!funnelSessionId || !adminKey) return;
    let cancelled = false;
    setFunnelLoading(true);
    setFunnelError(null);
    void fetchAdminVisitorSessionDetail(adminKey, funnelSessionId)
      .then((d) => {
        if (!cancelled) {
          setFunnelDetail(d);
          setFunnelLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setFunnelDetail(null);
          setFunnelError(e instanceof Error ? e.message : "Erro ao carregar sessão.");
          setFunnelLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [funnelSessionId, adminKey]);

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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Cadastrados</p>
                  <p className="text-2xl font-display text-primary">{data.users.length}</p>
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-display text-primary">{data.orders.length}</p>
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Consultas (logados)</p>
                  <p className="text-2xl font-display text-primary">{data.consultations.length}</p>
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Perguntas visitantes</p>
                  <p className="text-2xl font-display text-primary">{data.guest_logs_total ?? data.guest_logs?.length ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Perguntas IA (logados)</p>
                  <p className="text-2xl font-display text-primary">
                    {data.ai_question_logs_total ?? data.ai_question_logs?.length ?? 0}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar: e-mail, user_id, pedido, consulta, pergunta (visitante ou IA)…"
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
              <h2 className="font-display text-sm uppercase tracking-wider text-primary mb-2">
                Funil — sessões de visitantes
                <span className="text-muted-foreground font-body normal-case text-xs ml-2">
                  ({(data.visitor_sessions ?? []).length} carregadas)
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Cliques (captura), scroll a cada ~15%, rotas SPA, visibilidade da página, redimensionamento e saída. O mesmo filtro de busca acima aplica-se a visitante, caminho e user-agent. Requer a migration{" "}
                <code className="text-foreground">20260427120000_visitor_analytics</code> e deploy das funções{" "}
                <code className="text-foreground">visitor-analytics-ingest</code> e{" "}
                <code className="text-foreground">admin-visitor-session</code>.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-3">Última atividade</th>
                      <th className="py-2 pr-3">Visitante</th>
                      <th className="py-2 pr-3">Entrada</th>
                      <th className="py-2 pr-3">Auth</th>
                      <th className="py-2 pr-3">Terminou</th>
                      <th className="py-2">Eventos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.visitor_sessions ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-muted-foreground">
                          Nenhuma sessão ainda — confirme a migration e o deploy do ingest, ou aguarde tráfego.
                        </td>
                      </tr>
                    ) : visitorSessionsFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-muted-foreground">
                          Nenhum resultado para a busca atual.
                        </td>
                      </tr>
                    ) : (
                      visitorSessionsFiltered.map((s) => (
                        <tr key={s.id} className="border-b border-border/60 align-top">
                          <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(s.last_seen_at)}</td>
                          <td className="py-2 pr-3 font-mono text-xs break-all max-w-[10rem]">{s.visitor_client_id}</td>
                          <td className="py-2 pr-3 break-all max-w-xs text-xs">{s.entry_path || "—"}</td>
                          <td className="py-2 pr-3">{s.is_authenticated ? "Sim" : "Não"}</td>
                          <td className="py-2 pr-3">{s.ended_at ? fmtDate(s.ended_at) : "—"}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => setFunnelSessionId(s.id)}
                              className="text-primary hover:underline font-body"
                            >
                              Ver eventos
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <Dialog
              open={funnelSessionId != null}
              onOpenChange={(open) => {
                if (!open) {
                  setFunnelSessionId(null);
                  setFunnelDetail(null);
                  setFunnelError(null);
                }
              }}
            >
              <DialogContent className="max-w-3xl max-h-[min(88vh,720px)] overflow-y-auto border-border bg-card">
                <DialogHeader>
                  <DialogTitle className="font-display text-primary">Sessão — funil</DialogTitle>
                  <DialogDescription className="text-xs font-body">
                    Dados da sessão e lista de eventos por ordem de tempo (máx. 5000 por pedido).
                  </DialogDescription>
                </DialogHeader>
                {funnelLoading && <p className="text-sm text-muted-foreground font-body">A carregar…</p>}
                {funnelError && <p className="text-sm text-destructive font-body">{funnelError}</p>}
                {funnelDetail && !funnelLoading && (
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-display mb-1">Sessão</p>
                      <pre className="text-[11px] bg-muted/30 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {JSON.stringify(funnelDetail.session, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-display mb-2">
                        Eventos ({funnelDetail.event_count})
                      </p>
                      <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {funnelDetail.events.map((ev) => (
                          <li
                            key={ev.id}
                            className="border-b border-border/50 pb-3 text-xs font-mono text-foreground/90"
                          >
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              <span className="text-primary/90">{fmtDate(ev.recorded_at)}</span>
                              <strong className="text-primary">{ev.event_type}</strong>
                            </div>
                            <pre className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                              {JSON.stringify(ev.payload, null, 2)}
                            </pre>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

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
              <h2 className="font-display text-sm uppercase tracking-wider text-primary mb-3">
                Perguntas de visitantes (anónimos)
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Tabela <code className="text-foreground">guest_questions</code> — últimas{" "}
                {(data.guest_logs ?? []).length} linhas carregadas, total{" "}
                <strong>{data.guest_logs_total ?? (data.guest_logs ?? []).length}</strong>. O filtro de busca acima
                aplica-se a esta lista.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 pr-3">Tiragem</th>
                      <th className="py-2 pr-3 min-w-[220px]">Pergunta (texto completo)</th>
                      <th className="py-2 pr-3">Modelo</th>
                      <th className="py-2 min-w-[200px]">Prévia interpretação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.guest_logs ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-muted-foreground">
                          Nenhum registo. Confirme a migration <code className="text-foreground">20260422112000</code> e
                          o deploy de <code className="text-foreground">guest-interpret-once</code>.
                        </td>
                      </tr>
                    ) : guestLogsFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-muted-foreground">
                          Nenhum resultado para a busca atual.
                        </td>
                      </tr>
                    ) : (
                      guestLogsFiltered.map((g) => (
                        <tr key={g.id} className="border-b border-border/60 align-top">
                          <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(g.created_at)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{g.spread_name}</td>
                          <td className="py-2 pr-3 text-foreground break-words whitespace-pre-wrap">
                            {g.question?.trim() ? g.question : "— (leitura geral ou em branco)"}
                          </td>
                          <td className="py-2 pr-3 text-xs">{g.model_used || "—"}</td>
                          <td className="py-2 text-xs text-muted-foreground break-words">{g.interpretation_preview}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card/40 p-4">
              <h2 className="font-display text-sm uppercase tracking-wider text-primary mb-3">
                Perguntas IA (utilizadores logados)
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Tabela <code className="text-foreground">ai_readings</code> — últimas{" "}
                {(data.ai_question_logs ?? []).length} carregadas, total{" "}
                <strong>{data.ai_question_logs_total ?? (data.ai_question_logs ?? []).length}</strong>.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2 pr-3">E-mail</th>
                      <th className="py-2 pr-3">Tiragem</th>
                      <th className="py-2 pr-3 min-w-[220px]">Pergunta</th>
                      <th className="py-2 pr-3">Modelo</th>
                      <th className="py-2 min-w-[200px]">Prévia interpretação</th>
                      <th className="py-2 pr-2">Utilizador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.ai_question_logs ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-muted-foreground">
                          Nenhuma interpretação IA registada ainda, ou a tabela não está acessível.
                        </td>
                      </tr>
                    ) : aiQuestionLogsFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-muted-foreground">
                          Nenhum resultado para a busca atual.
                        </td>
                      </tr>
                    ) : (
                      aiQuestionLogsFiltered.map((r) => (
                        <tr key={r.id} className="border-b border-border/60 align-top">
                          <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                          <td className="py-2 pr-3 break-all">{r.email || "—"}</td>
                          <td className="py-2 pr-3">{r.spread_name}</td>
                          <td className="py-2 pr-3 break-words whitespace-pre-wrap">
                            {r.question?.trim() ? r.question : "—"}
                          </td>
                          <td className="py-2 pr-3 text-xs">{r.model_used || "—"}</td>
                          <td className="py-2 text-xs text-muted-foreground break-words">{r.interpretation_preview}</td>
                          <td className="py-2 pr-2">
                            {r.user_id ? (
                              <Link
                                to={`/admin/user/${r.user_id}?key=${encodeURIComponent(adminKey)}`}
                                className="text-primary hover:underline whitespace-nowrap"
                              >
                                Ver
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
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
