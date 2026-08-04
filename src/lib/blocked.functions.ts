import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

function clientIp(req: Request | undefined): string | null {
  if (!req) return null;
  const h = req.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "";
  return ip || null;
}

function normPhone(p: string): string {
  let v = (p || "").replace(/[^0-9]/g, "");
  if (v.startsWith("00")) v = v.slice(2);
  if (v.startsWith("0")) v = "964" + v.replace(/^0+/, "");
  return v;
}

/** يرجع عنوان IP الزائر وحالة الحظر (IP / هاتف / إيميل) */
export const checkBlocked = createServerFn({ method: "POST" })
  .inputValidator((d: { phone?: string; email?: string | null }) => d)
  .handler(async ({ data }) => {
    const req = getRequest();
    const ip = clientIp(req);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("blocked_entities")
      .select("type, value")
      .limit(2000);

    const phone = normPhone(data.phone || "");
    const email = (data.email || "").trim().toLowerCase();

    let blocked = false;
    for (const r of (rows as { type: string; value: string }[] | null) || []) {
      const v = (r.value || "").trim().toLowerCase();
      if (!v) continue;
      if (r.type === "ip" && ip && v === ip.toLowerCase()) blocked = true;
      if (r.type === "phone" && phone && normPhone(v) === phone) blocked = true;
      if (r.type === "email" && email && v === email) blocked = true;
      if (blocked) break;
    }

    return { ip, blocked };
  });
