import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchAdminUserDetail, type AdminUserDetailResponse } from "@/lib/admin";

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleString("pt-BR");
}

const AdminUserDetail = () => {
  const { userId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get("key") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);

  const getOrderAnchorByConsult = (consultUsedCredit: boolean): string | null => {
    if (!consultUsedCredit || !data) return null;
    const paid = data.orders.find((o) => o.status === "approved" || o.status === "paid" || o.status === "authorized");
    return paid ? `order-${paid.id}` : null;
  };

  useEffect(() => {
    if (!adminKey || !userId) {
      setLoading(false);
      setError("URL inválida. Use /admin/user/ID?key=SUA_CHAVE.");
      return;
    }
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const res = await fetchAdminUserDetail(adminKey, userId);
        if (!active) return;
        setData(res);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar utilizador.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [adminKey, userId]);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl text-primary uppercase tracking-wider">Detalhe do Usuário</h1>
          <Link to={`/admin?key=${encodeURIComponent(adminKey)}`} className="text-sm text-muted-foreground hover:text-primary">
            Voltar ao admin
          </Link>
        </div>

        {loading && <p className="text-sm text-muted-foreground">A carregar…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && data && (
          <>
            <section className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
              <p><strong>ID:</strong> {data.user.id}</p>
              <p><strong>E-mail:</strong> {data.user.email || "-"}</p>
              <p><strong>Criado:</strong> {fmtDate(data.user.created_at)}</p>
              <p><strong>Último login:</strong> {fmtDate(data.user.last_sign_in_at)}</p>
              <p><strong>Créditos atuais:</strong> {data.profile?.credits ?? "-"}</p>
              <p><strong>Oferta boas-vindas já usada:</strong> {data.profile?.first_free_full_consult_used ? "Sim" : "Não"}</p>
            </section>

            <section className="rounded-xl border border-border bg-card/40 p-4">
              <h2 className="font-display text-sm uppercase tracking-wider text-primary mb-3">Pedidos</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-3">Pedido</th>
                      <th className="py-2 pr-3">Pacote</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Créditos</th>
                      <th className="py-2 pr-3">Criado</th>
                      <th className="py-2">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o.id} id={`order-${o.id}`} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-mono text-xs">{o.id}</td>
                        <td className="py-2 pr-3">{o.package_id}</td>
                        <td className="py-2 pr-3">{o.status}</td>
                        <td className="py-2 pr-3">{o.credits}</td>
                        <td className="py-2 pr-3">{fmtDate(o.created_at)}</td>
                        <td className="py-2">{fmtDate(o.paid_at)}</td>
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
                      <th className="py-2 pr-3">Tiragem</th>
                      <th className="py-2 pr-3">Pagou crédito</th>
                      <th className="py-2 pr-3">Boas-vindas IA</th>
                      <th className="py-2 pr-3">Data</th>
                      <th className="py-2">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.consultations.map((c) => (
                      <tr key={c.id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-mono text-xs">{c.id}</td>
                        <td className="py-2 pr-3">{c.spread_name}</td>
                        <td className="py-2 pr-3">{c.used_credit ? "Sim" : "Não"}</td>
                        <td className="py-2 pr-3">{c.welcome_free_ai ? "Sim" : "Não"}</td>
                        <td className="py-2 pr-3">{fmtDate(c.created_at)}</td>
                        <td className="py-2">
                          {getOrderAnchorByConsult(c.used_credit) ? (
                            <a
                              href={`#${getOrderAnchorByConsult(c.used_credit)}`}
                              className="text-primary hover:underline"
                            >
                              Ir para pedido
                            </a>
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

export default AdminUserDetail;
