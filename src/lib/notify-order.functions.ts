import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

type Item = { name: string; qty: number; price: number };
type Payload = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  paymentMethod: string;
  total: number;
  items: Item[];
  proofUrl?: string | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n)) + " IQD";
}

export const notifyAdminNewOrder = createServerFn({ method: "POST" })
  .inputValidator((data: Payload) => data)
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "7126623171";

    const shortId = data.orderId.slice(0, 8).toUpperCase();
    const itemsLines = data.items
      .map((i) => `• ${i.name} × ${i.qty} — ${fmt(i.price * i.qty)}`)
      .join("\n");

    const caption =
      `🛒 <b>طلب جديد — FPI STOR</b>\n\n` +
      `🆔 <code>#${shortId}</code>\n` +
      `👤 ${data.customerName}\n` +
      `📞 <code>${data.customerPhone}</code>\n` +
      (data.customerEmail ? `✉️ ${data.customerEmail}\n` : "") +
      `💳 ${data.paymentMethod}\n\n` +
      `<b>المنتجات:</b>\n${itemsLines}\n\n` +
      `💰 <b>الإجمالي:</b> ${fmt(data.total)}`;

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

    const chatId: string | number = useDirect
      ? TELEGRAM_CHAT_ID
      : Number(TELEGRAM_CHAT_ID);

    try {
      if (data.proofUrl) {
        const res = await fetch(`${baseUrl}/sendPhoto`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            chat_id: chatId,
            photo: data.proofUrl,
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
              text: caption + `\n\n🧾 <a href="${data.proofUrl}">إثبات الدفع</a>`,
              parse_mode: "HTML",
            }),
          });
          return { ok: true, fallback: true, mode: useDirect ? "direct" : "gateway", body };
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
        return { ok: false, error: `telegram_${res.status}`, body };
      }
      return { ok: true, mode: useDirect ? "direct" : "gateway" };
    } catch (e: any) {
      return { ok: false, error: e?.message || "fetch_failed" };
    }
  });
