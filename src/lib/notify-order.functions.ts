import { createServerFn } from "@tanstack/react-start";

const ADMIN_CHAT_ID = 7126623171;
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
    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      return { ok: false, error: "missing_keys" };
    }

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

    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    };

    try {
      if (data.proofUrl) {
        // إرسال صورة إثبات الدفع مع تفاصيل الطلب في التسمية التوضيحية
        const res = await fetch(`${GATEWAY_URL}/sendPhoto`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            photo: data.proofUrl,
            caption,
            parse_mode: "HTML",
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          // fallback: أرسل الرسالة نصياً مع رابط الصورة
          await fetch(`${GATEWAY_URL}/sendMessage`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              chat_id: ADMIN_CHAT_ID,
              text: caption + `\n\n🧾 <a href="${data.proofUrl}">إثبات الدفع</a>`,
              parse_mode: "HTML",
            }),
          });
          return { ok: true, fallback: true, body };
        }
        return { ok: true };
      }

      const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: caption,
          parse_mode: "HTML",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: `telegram_${res.status}`, body };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "fetch_failed" };
    }
  });
