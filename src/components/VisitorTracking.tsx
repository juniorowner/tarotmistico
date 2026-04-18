import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { initVisitorTracking, trackVisitorRoute } from "@/lib/visitorTracking";

/**
 * Rastreio de funil anónimo (cliques, scroll, rotas, visibilidade, saída).
 * Desligar: VITE_ENABLE_VISITOR_ANALYTICS=false
 * Opcional: VITE_ANALYTICS_INGEST_SECRET alinhado ao secret da função `visitor-analytics-ingest`.
 */
export function VisitorTracking() {
  const location = useLocation();
  const { user } = useAuth();
  const authRef = useRef<() => string | null>(() => null);
  authRef.current = () => user?.id ?? null;

  useEffect(() => {
    const cleanup = initVisitorTracking(() => authRef.current());
    return cleanup;
  }, []);

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    trackVisitorRoute(path);
  }, [location.pathname, location.search, location.hash]);

  return null;
}
