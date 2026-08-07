import { createServerFn } from "@tanstack/react-start";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const notifyAdminNewOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => {
    const orderId = String(data?.orderId ?? "");
    if (!UUID_RE.test(orderId)) throw new Error("invalid_order_id");
    return { orderId };
  })
  .handler(async ({ data }) => {
    const { isChannelEnabled } = await import("@/lib/notify-settings.server");
    if (!(await isChannelEnabled("notify_admin_telegram"))) {
      console.error("[telegram] channel disabled in dashboard settings");
      return { ok: false, error: "channel_disabled" };
    }

    const { serverSupabase } = await import("@/lib/whatsapp.server");
    const {
      resolveTelegramConfig,
      missingTelegramFields,
      sendTelegramNotice,
      fmtIQD,
      escHtml,
      safeHttpUrl,
    } = await import("@/lib/telegram.server");

    const supabase = serverSupabase();

    const cfg = await resolveTelegramConfig(supabase);
    if (cfg.mode === "none") {
      const missing = missingTelegramFields(cfg);
      console.error("[telegram] missing credentials:", missing.join(", "));
      return { ok: false, error: "telegram_not_configured", missing };
    }

    // All message content comes from the database, never from the caller.
    let order: any = null;
    let items: any[] = [];

    const direct = await supabase
      .from("orders")
      .select(
        "id, customer_name, customer_phone, customer_email, total, payment_method_name, payment_proof_url, created_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();

    if (direct.data) {
      order = direct.data;
      const { data: rows } = await supabase
        .from("order_items")
        .select("product_name, quantity, unit_price")
        .eq("order_id", data.orderId);
      items = rows || [];
    } else {
      if (direct.error) console.error("[telegram] direct order read failed:", direct.error.message);
      const { data: rows, error } = await supabase.rpc("get_orders_by_ids" as any, {
        _ids: [data.orderId],
      });
      if (error) console.error("[telegram] get_orders_by_ids failed:", error.message);
      const row = Array.isArray(rows) ? (rows[0] as any) : null;
      if (row) {
        order = row;
        items = Array.isArray(row.items) ? row.items : [];
      }
    }

    if (!order) {
      console.error("[telegram] order not found:", data.orderId);
      return { ok: false, error: "order_not_found" };
    }

    // Only notify for freshly created orders (guards against replay/spam).
    if (Date.now() - new Date(order.created_at).getTime() > 15 * 60 * 1000) {
      return { ok: false, error: "order_too_old" };
    }

    const shortId = String(order.id).slice(0, 8).toUpperCase();
    const itemsLines = (items || [])
      .map(
        (i: any) =>
          `• ${escHtml(i.product_name)} × ${i.quantity} — ${fmtIQD(Number(i.unit_price) * Number(i.quantity))}`,
      )
      .join("\n");

    const proofUrl = safeHttpUrl(order.payment_proof_url);

    const caption =
      `🛒 <b>طلب جديد — FPI STOR</b>\n\n` +
      `🆔 <code>#${shortId}</code>\n` +
      `👤 ${escHtml(order.customer_name)}\n` +
      `📞 <code>${escHtml(order.customer_phone)}</code>\n` +
      (order.customer_email ? `✉️ ${escHtml(order.customer_email)}\n` : "") +
      `💳 ${escHtml(order.payment_method_name || "—")}\n\n` +
      `<b>المنتجات:</b>\n${itemsLines || "—"}\n\n` +
      `💰 <b>الإجمالي:</b> ${fmtIQD(Number(order.total))}`;

    try {
      const res = await sendTelegramNotice(cfg, caption, proofUrl);
      if (!res.ok) console.error("[telegram] order notice failed:", JSON.stringify(res));
      return res;
    } catch (e: any) {
      console.error("[telegram] send threw:", e?.message || e);
      return { ok: false, error: "send_failed", description: String(e?.message || e) };
    }
  });
