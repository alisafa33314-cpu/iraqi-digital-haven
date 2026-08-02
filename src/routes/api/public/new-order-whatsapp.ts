import { createFileRoute } from '@tanstack/react-router'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/api/public/new-order-whatsapp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { adminSupabase, loadGreenConfig, sendWhatsApp, fmtIQD } = await import(
          '@/lib/whatsapp.server'
        )

        const supabase = adminSupabase()
        if (!supabase) {
          return Response.json({ error: 'server_configuration_error' }, { status: 500 })
        }

        let orderId = ''
        try {
          const body = await request.json()
          orderId = String((body as any)?.orderId || '')
        } catch {
          return Response.json({ error: 'invalid_json' }, { status: 400 })
        }
        if (!UUID_RE.test(orderId)) {
          return Response.json({ error: 'invalid_order_id' }, { status: 400 })
        }

        const cfg = await loadGreenConfig(supabase)
        if (!cfg.idInstance || !cfg.apiToken || !cfg.phone) {
          return Response.json({ success: false, reason: 'whatsapp_not_configured' }, { status: 200 })
        }

        const { data: order, error } = await supabase
          .from('orders')
          .select(
            'id, customer_name, customer_phone, customer_email, total, payment_method_name, created_at',
          )
          .eq('id', orderId)
          .maybeSingle()

        if (error || !order) {
          return Response.json(
            { error: 'order_not_found', reason: error?.message },
            { status: 404 },
          )
        }

        const { data: items } = await supabase
          .from('order_items')
          .select('product_name, quantity, unit_price')
          .eq('order_id', orderId)

        const itemLines = (items || [])
          .map(
            (i: any) =>
              `• ${i.product_name} × ${i.quantity} — ${fmtIQD(Number(i.unit_price) * i.quantity)}`,
          )
          .join('\n')

        const message =
          `🛒 *طلب جديد — FPI STOR*\n\n` +
          `🆔 رقم الطلب: ${order.id.slice(0, 8).toUpperCase()}\n` +
          `👤 الزبون: ${order.customer_name}\n` +
          `📞 الهاتف: ${order.customer_phone}\n` +
          (order.customer_email ? `✉️ الإيميل: ${order.customer_email}\n` : '') +
          `\n*المنتجات:*\n${itemLines || '—'}\n\n` +
          `💳 وسيلة الدفع: ${order.payment_method_name || '—'}\n` +
          `💰 الإجمالي: ${fmtIQD(Number(order.total))}`

        try {
          const r = await sendWhatsApp(cfg, message)
          if (!r.ok) {
            return Response.json(
              { success: false, reason: `greenapi_${r.status}`, body: r.body },
              { status: 502 },
            )
          }
          return Response.json({ success: true, id: (r.body as any)?.idMessage })
        } catch (e: any) {
          return Response.json(
            { success: false, reason: e?.message || 'fetch_failed' },
            { status: 502 },
          )
        }
      },
    },
  },
})
