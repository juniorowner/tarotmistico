const GA_MEASUREMENT_ID = "G-X7WDEX9JPP";

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

/** Carrega gtag.js apenas fora de ambiente local / dev (evita ruído no `npm run dev`). */
export function initGoogleAnalytics(): void {
  if (import.meta.env.DEV) return;
  if (isLocalHost()) return;
  if (typeof document === "undefined") return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}
