import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

function detectDevice(ua: string): string {
  const s = (ua || "").toLowerCase();
  if (/ipad|tablet/.test(s)) return "tablet";
  if (/mobi|iphone|android/.test(s)) return "mobile";
  if (/bot|crawler|spider/.test(s)) return "bot";
  return "desktop";
}

async function hashIp(ip: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(ip + "|fpistor-salt");
    const h = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  } catch { return ""; }
}

function readGeo(req: Request): { country: string | null; city: string | null; ip: string } {
  const h = req.headers;
  const cf: any = (req as any).cf || {};
  const country = h.get("cf-ipcountry") || cf.country || null;
  const city = cf.city || h.get("x-vercel-ip-city") || null;
  const ip = h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  return { country, city, ip };
}

export const trackView = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; path: string; referrer?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const req = getRequest();
    const ua = req?.headers.get("user-agent") || "";
    const { country, city, ip } = req ? readGeo(req) : { country: null, city: null, ip: "" };
    const ip_hash = ip ? await hashIp(ip) : null;
    const { data: row, error } = await supabaseAdmin.from("page_views").insert({
      session_id: data.sessionId,
      path: data.path,
      referrer: data.referrer || null,
      user_agent: ua.slice(0, 500),
      device: detectDevice(ua),
      country, city, ip_hash,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const trackPing = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; durationMs: number }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("page_views").update({
      duration_ms: Math.max(0, Math.min(data.durationMs, 6 * 60 * 60 * 1000)),
      last_ping_at: new Date().toISOString(),
    }).eq("id", data.id);
    return { ok: true };
  });

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; name: string; path?: string; data?: unknown }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("page_events").insert({
      session_id: data.sessionId,
      name: data.name.slice(0, 80),
      path: data.path || null,
      data: (data.data as any) ?? null,
    });
    return { ok: true };
  });

export const adminAnalytics = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error: authErr } = await supabaseAdmin.rpc("admin_check_code" as any, { _code: data.code });
    if (authErr) throw new Error("unauthorized");
    void ok;
    const now = Date.now();
    const since24 = new Date(now - 24 * 3600 * 1000).toISOString();
    const since7d = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const liveSince = new Date(now - 2 * 60 * 1000).toISOString();

    const [totals24h, totals7d, live, top, geo, devices, events] = await Promise.all([
      supabaseAdmin.from("page_views").select("session_id, id", { count: "exact" }).gte("created_at", since24),
      supabaseAdmin.from("page_views").select("session_id, id", { count: "exact" }).gte("created_at", since7d),
      supabaseAdmin.from("page_views").select("session_id, path, country, city, device, last_ping_at").gte("last_ping_at", liveSince),
      supabaseAdmin.from("page_views").select("path, duration_ms").gte("created_at", since7d).limit(5000),
      supabaseAdmin.from("page_views").select("country, city").gte("created_at", since7d).limit(5000),
      supabaseAdmin.from("page_views").select("device").gte("created_at", since7d).limit(5000),
      supabaseAdmin.from("page_events").select("name, path, data, created_at").gte("created_at", since7d).order("created_at", { ascending: false }).limit(200),
    ]);

    const uniq = (rows: any[] | null | undefined) => new Set((rows || []).map((r) => r.session_id)).size;
    const pathStats: Record<string, { views: number; total: number }> = {};
    for (const r of top.data || []) {
      const p = r.path || "/";
      pathStats[p] = pathStats[p] || { views: 0, total: 0 };
      pathStats[p].views += 1;
      pathStats[p].total += Number(r.duration_ms || 0);
    }
    const topPages = Object.entries(pathStats)
      .map(([path, v]) => ({ path, views: v.views, avgMs: Math.round(v.total / v.views) }))
      .sort((a, b) => b.views - a.views).slice(0, 15);

    const countries: Record<string, number> = {};
    const cities: Record<string, number> = {};
    for (const r of geo.data || []) {
      const c = r.country || "غير معروف"; countries[c] = (countries[c] || 0) + 1;
      if (r.city) cities[r.city] = (cities[r.city] || 0) + 1;
    }
    const devMap: Record<string, number> = {};
    for (const r of devices.data || []) {
      const d = r.device || "unknown"; devMap[d] = (devMap[d] || 0) + 1;
    }

    const liveRows = live.data || [];
    const liveUsers = new Set(liveRows.map((r: any) => r.session_id)).size;
    const livePages: Record<string, number> = {};
    for (const r of liveRows as any[]) { livePages[r.path] = (livePages[r.path] || 0) + 1; }

    return {
      visitors24h: uniq(totals24h.data),
      views24h: totals24h.count || 0,
      visitors7d: uniq(totals7d.data),
      views7d: totals7d.count || 0,
      liveUsers,
      livePages: Object.entries(livePages).map(([path, n]) => ({ path, n })).sort((a, b) => b.n - a.n).slice(0, 10),
      topPages,
      countries: Object.entries(countries).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n).slice(0, 15),
      cities: Object.entries(cities).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n).slice(0, 15),
      devices: Object.entries(devMap).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n),
      recentEvents: (events.data || []).slice(0, 50),
    };
  });
