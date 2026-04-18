import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "tarot:visitor-id:v2";
const SESSION_KEY = "tarot:analytics-session:v1";
const START_KEY = "tarot:analytics-started:v1";

const MAX_EVENTS_PER_SESSION = 450;
const FLUSH_MS = 4000;
const MAX_BATCH = 40;

type QueuedEvent = {
  event_type: string;
  recorded_at: string;
  payload: Record<string, unknown>;
};

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId = "";
let visitorId = "";
let startedAt = "";
let maxScrollEmitted = 0;
let totalTracked = 0;
let flushInterval: ReturnType<typeof setInterval> | null = null;

/** Atualizado em initVisitorTracking — usado nos flushes agendados. */
let authGetter: () => string | null = () => null;

function uuid(): string {
  return crypto.randomUUID();
}

export function isVisitorTrackingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.VITE_ENABLE_VISITOR_ANALYTICS === "false") return false;
  return true;
}

function shouldTrackPathname(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  return true;
}

function getVisitorId(): string {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = `v_${uuid()}`;
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return `t_${uuid()}`;
  }
}

function getOrCreateSession(): { sessionId: string; startedAt: string } {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    let st = sessionStorage.getItem(START_KEY);
    if (!sid || !st) {
      sid = uuid();
      st = new Date().toISOString();
      sessionStorage.setItem(SESSION_KEY, sid);
      sessionStorage.setItem(START_KEY, st);
    }
    return { sessionId: sid, startedAt: st };
  } catch {
    return { sessionId: uuid(), startedAt: new Date().toISOString() };
  }
}

function parseUtm(): Record<string, string> {
  try {
    const u = new URL(window.location.href);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const o: Record<string, string> = {};
    for (const k of keys) {
      const v = u.searchParams.get(k);
      if (v) o[k] = v.slice(0, 200);
    }
    return o;
  } catch {
    return {};
  }
}

function buildSessionPayload(getAuthUserId: () => string | null, ended: boolean): Record<string, unknown> {
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const uid = getAuthUserId();
  const row: Record<string, unknown> = {
    id: sessionId,
    visitor_client_id: visitorId,
    started_at: startedAt,
    user_agent: navigator.userAgent.slice(0, 2000),
    language: navigator.language,
    referrer: (document.referrer || "").slice(0, 2000),
    entry_path: path.slice(0, 2000),
    screen_w: window.screen.width,
    screen_h: window.screen.height,
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    utm: parseUtm(),
    is_authenticated: Boolean(uid),
    auth_user_id: uid ?? undefined,
    meta: { tracking_version: 1 },
  };
  if (ended) {
    row.ended_at = new Date().toISOString();
  }
  return row;
}

async function sendToServer(
  getAuthUserId: () => string | null,
  events: QueuedEvent[],
  sessionEnded: boolean
): Promise<void> {
  if (!sessionId) return;
  const secret = import.meta.env.VITE_ANALYTICS_INGEST_SECRET as string | undefined;
  const session = buildSessionPayload(getAuthUserId, sessionEnded);
  try {
    const { error } = await supabase.functions.invoke("visitor-analytics-ingest", {
      body: { session, events },
      headers: secret ? { "x-analytics-ingest": secret } : {},
    });
    if (error) console.warn("[visitorTracking]", error.message);
  } catch (e) {
    console.warn("[visitorTracking] request failed", e);
  }
}

export async function flushVisitorQueue(
  getAuthUserId: () => string | null,
  opts?: { ended?: boolean }
): Promise<void> {
  const ended = opts?.ended === true;
  if (!sessionId) return;

  if (queue.length === 0) {
    if (ended) await sendToServer(getAuthUserId, [], true);
    return;
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_BATCH);
    const isLastBatch = queue.length === 0;
    await sendToServer(getAuthUserId, batch, ended && isLastBatch);
  }
}

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushVisitorQueue(authGetter, { ended: false });
  }, FLUSH_MS);
}

export function pushVisitorEvent(event_type: string, payload: Record<string, unknown> = {}) {
  if (!isVisitorTrackingEnabled() || !sessionId) return;
  if (!shouldTrackPathname(window.location.pathname)) return;
  if (totalTracked >= MAX_EVENTS_PER_SESSION) return;

  totalTracked += 1;
  queue.push({
    event_type,
    recorded_at: new Date().toISOString(),
    payload,
  });

  if (queue.length >= MAX_BATCH) {
    void flushVisitorQueue(authGetter, { ended: false });
  } else {
    scheduleFlush();
  }
}

/** Rota SPA — chamar a partir do router. */
export function trackVisitorRoute(fullPath: string) {
  if (!isVisitorTrackingEnabled() || !sessionId) return;
  const pathname = fullPath.split("?")[0]?.split("#")[0] ?? "";
  if (!shouldTrackPathname(pathname)) return;
  pushVisitorEvent("route", { path: fullPath.slice(0, 2000) });
}

export function initVisitorTracking(getAuthUserId: () => string | null): () => void {
  if (typeof window === "undefined") return () => {};
  if (!isVisitorTrackingEnabled()) return () => {};
  if (!shouldTrackPathname(window.location.pathname)) return () => {};

  authGetter = getAuthUserId;
  visitorId = getVisitorId();
  const s = getOrCreateSession();
  sessionId = s.sessionId;
  startedAt = s.startedAt;
  maxScrollEmitted = 0;

  const onClick = (e: MouseEvent) => {
    const el = e.target as HTMLElement | null;
    if (!el) return;
    if (el.closest("[data-no-track]")) return;
    const tag = el.tagName;
    const id = el.id ? `#${el.id}` : "";
    let cls = "";
    if (typeof el.className === "string") cls = el.className.split(/\s+/).slice(0, 5).join(".");
    let label = "";
    const lab = el.getAttribute("aria-label");
    if (lab) label = lab.slice(0, 100);
    else if (el.innerText) label = el.innerText.replace(/\s+/g, " ").trim().slice(0, 100);
    pushVisitorEvent("click", {
      tag,
      id,
      cls: cls.slice(0, 140),
      label,
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
      path: window.location.pathname,
    });
  };

  let scrollScheduled: ReturnType<typeof setTimeout> | null = null;
  const onScroll = () => {
    if (scrollScheduled != null) return;
    scrollScheduled = setTimeout(() => {
      scrollScheduled = null;
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const height = doc.scrollHeight - window.innerHeight;
      const pct = height <= 0 ? 100 : Math.min(100, Math.round((scrollTop / Math.max(height, 1)) * 100));
      const step = 15;
      const milestone = Math.min(100, Math.floor(pct / step) * step);
      if (milestone > maxScrollEmitted) {
        maxScrollEmitted = milestone;
        pushVisitorEvent("scroll", { depth_pct: milestone, raw_pct: pct, path: window.location.pathname });
      }
    }, 400);
  };

  const onVisibility = () => {
    pushVisitorEvent("visibility", { state: document.visibilityState });
  };

  const onHide = () => {
    if (flushTimer != null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flushVisitorQueue(authGetter, { ended: true });
  };

  let resizeScheduled: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (resizeScheduled != null) return;
    resizeScheduled = setTimeout(() => {
      resizeScheduled = null;
      pushVisitorEvent("resize", {
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
      });
    }, 500);
  };

  document.addEventListener("click", onClick, true);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("beforeunload", onHide);
  window.addEventListener("resize", onResize);

  pushVisitorEvent("session_ping", {
    path: `${window.location.pathname}${window.location.search}${window.location.hash}`.slice(0, 2000),
  });

  flushInterval = setInterval(() => {
    void flushVisitorQueue(authGetter, { ended: false });
  }, FLUSH_MS);

  return () => {
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onHide);
    window.removeEventListener("beforeunload", onHide);
    window.removeEventListener("resize", onResize);
    if (flushInterval) {
      clearInterval(flushInterval);
      flushInterval = null;
    }
    if (flushTimer != null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flushVisitorQueue(authGetter, { ended: true });
  };
}
