import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackView, trackPing, trackEvent } from "./track.functions";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem("fpi_sid");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("fpi_sid", id);
    }
    return id;
  } catch { return "anon"; }
}

export function useAnalytics() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const viewIdRef = useRef<string | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sessionId = getSessionId();
    startRef.current = Date.now();
    viewIdRef.current = null;
    let cancelled = false;

    trackView({ data: { sessionId, path, referrer: document.referrer || undefined } })
      .then((r) => { if (!cancelled) viewIdRef.current = r.id; })
      .catch(() => {});

    const ping = () => {
      const id = viewIdRef.current;
      if (!id) return;
      trackPing({ data: { id, durationMs: Date.now() - startRef.current } }).catch(() => {});
    };
    const interval = window.setInterval(ping, 30_000);
    const onHide = () => ping();
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      cancelled = true;
      ping();
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [path]);
}

export function logEvent(name: string, data?: unknown) {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  trackEvent({ data: { sessionId, name, path: window.location.pathname, data } }).catch(() => {});
}
