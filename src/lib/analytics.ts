type EventParams = Record<string, string | number | boolean | null | undefined>;

type GtagFn = (command: "event", eventName: string, params?: EventParams) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const maybe = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof maybe === "function" ? maybe : null;
}

export function trackEvent(eventName: string, params?: EventParams) {
  const gtag = getGtag();
  if (!gtag) return;
  gtag("event", eventName, params);
}

