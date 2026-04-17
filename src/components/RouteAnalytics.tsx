import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent, trackPageView } from "@/lib/analytics";

export function RouteAnalytics() {
  const location = useLocation();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    if (path === lastTrackedPath.current) return;
    lastTrackedPath.current = path;

    trackPageView(path, document.title);
    if (location.pathname === "/creditos") {
      trackEvent("creditos_page_view");
    }
  }, [location]);

  return null;
}
