import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackEvent } from "./track.functions";
import { cloud } from "./cloud-client";

function detectDevice(ua: string): string {
  const s = ua.toLowerCase();
  if (/bot|crawler|spider|slurp|bingpreview|facebookexternalhit/.test(s)) return "bot";
  if (/iphone/.test(s)) return "iPhone";
  if (/ipad/.test(s)) return "iPad";
  if (/android/.test(s)) return /mobi/.test(s) ? "Android" : "Android Tablet";
  if (/mobi/.test(s)) return "Mobile";
  if (/macintosh|mac os x/.test(s)) return "Mac";
  if (/windows/.test(s)) return "Windows";
  if (/linux/.test(s)) return "Linux";
  return "Desktop";
}

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

    const ua = navigator.userAgent || "";
    if (!path.startsWith("/admin")) {
      cloud.rpc("track_view" as any, { _session: sessionId, _path: path, _referrer: document.referrer || null, _ua: ua, _device: detectDevice(ua) } as any)
        .then(({ data }) => { if (!cancelled && data) viewIdRef.current = data as unknown as string; });
    }

    const ping = () => {
      const id = viewIdRef.current;
      if (!id) return;
      cloud.rpc("track_ping" as any, { _id: id, _session: sessionId, _duration: Date.now() - startRef.current } as any).then(() => {});
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
