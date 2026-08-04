import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n)) + " IQD";
}

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeHttpUrl(u: unknown): string | null {
  try {
    const parsed = new URL(String(u ?? ""));
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export const notifyAdminNewOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => {
    const orderId = String(data?.orderId ?? "");
    if (!UUID_RE.test(orderId)) throw new Error("invalid_order_id");
    return { orderId };
  })
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "7126623171";

    // All message content comes from the database, never from the caller.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, customer_name, customer_phone, customer_email, total, payment_method_name, payment_proof_url, created_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();

    if (!order) return { ok: false, error: "order_not_found" };

    // Only notify for freshly created orders (guards against replay/spam).
    if (Date.now() - new Date(order.created_at).getTime() > 15 * 60 * 1000) {
      return { ok: false, error: "order_too_old" };
    }

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .eq("order_id", data.orderId);

    const shortId = String(order.id).slice(0, 8).toUpperCase();
    const itemsLines = (items || [])
      .map(
        (i: any) =>
          `• ${esc(i.product_name)} × ${i.quantity} — ${fmt(Number(i.unit_price) * i.quantity)}`,
      )
      .join("\n");

    const proofUrl = safeHttpUrl(order.payment_proof_url);

    const caption =
      `🛒 <b>طلب جديد — FPI STOR</b>\n\n` +
      `🆔 <code>#${shortId}</code>\n` +
      `👤 ${esc(order.customer_name)}\n` +
      `📞 <code>${esc(order.customer_phone)}</code>\n` +
      (order.customer_email ? `✉️ ${esc(order.customer_email)}\n` : "") +
      `💳 ${esc(order.payment_method_name || "—")}\n\n` +
      `<b>المنتجات:</b>\n${itemsLines || "—"}\n\n` +
      `💰 <b>الإجمالي:</b> ${fmt(Number(order.total))}`;

    // اختر الوضع: مباشر (Vercel/أي استضافة) عبر TELEGRAM_BOT_TOKEN، أو gateway (Lovable)
    const useDirect = !!TELEGRAM_BOT_TOKEN;
    const useGateway = !useDirect && !!(LOVABLE_API_KEY && TELEGRAM_API_KEY);

    if (!useDirect && !useGateway) {
      return { ok: false, error: "missing_keys" };
    }

    const baseUrl = useDirect
      ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
      : GATEWAY_URL;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (useGateway) {
      headers.Authorization = `Bearer ${LOVABLE_API_KEY}`;
      headers["X-Connection-Api-Key"] = TELEGRAM_API_KEY as string;
    }

    const chatId: string | number = useDirect ? TELEGRAM_CHAT_ID : Number(TELEGRAM_CHAT_ID);

    try {
      if (proofUrl) {
        const res = await fetch(`${baseUrl}/sendPhoto`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            chat_id: chatId,
            photo: proofUrl,
            caption,
            parse_mode: "HTML",
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || (body && body.ok === false)) {
          await fetch(`${baseUrl}/sendMessage`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              chat_id: chatId,
              text: caption + `\n\n🧾 <a href="${esc(proofUrl)}">إثبات الدفع</a>`,
              parse_mode: "HTML",
            }),
          });
          return { ok: true, fallback: true, mode: useDirect ? "direct" : "gateway" };
        }
        return { ok: true, mode: useDirect ? "direct" : "gateway" };
      }

      const res = await fetch(`${baseUrl}/sendMessage`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          chat_id: chatId,
          text: caption,
          parse_mode: "HTML",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || (body && body.ok === false)) {
        return { ok: false, error: `telegram_${res.status}` };
      }
      return { ok: true, mode: useDirect ? "direct" : "gateway" };
    } catch (e: any) {
      return { ok: false, error: "send_failed" };
    }
  });
