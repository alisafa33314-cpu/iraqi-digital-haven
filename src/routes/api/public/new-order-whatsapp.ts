import { createFileRoute } from '@tanstack/react-router'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export const Route = createFileRoute('/api/public/new-order-whatsapp')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {

        const { isChannelEnabled } = await import('@/lib/notify-settings.server')
        if (!(await isChannelEnabled('notify_admin_whatsapp'))) {
          return Response.json({ success: false, reason: 'channel_disabled' }, { headers: CORS })
        }

        const { serverSupabase, resolveGreenConfig, sendWhatsApp, fmtIQD, missingGreenFields } =
          await import('@/lib/whatsapp.server')

        const supabase = serverSupabase()

        let orderId = ''
        try {
          const body = await request.json()
          orderId = String((body as any)?.orderId || '')
        } catch {
          return Response.json({ error: 'invalid_json' }, { status: 400, headers: CORS })
        }
        if (!UUID_RE.test(orderId)) {
          return Response.json({ error: 'invalid_order_id' }, { status: 400, headers: CORS })
        }

        // Primary path: the database sends the WhatsApp message itself (security-definer
        // RPC reads Green API settings + order rows, then calls Green API via pg_net).
        // This works from any host/domain and needs no service-role key or env vars.
        try {
          const { data, error } = await supabase.rpc('whatsapp_notify_order' as any, {
            _order_id: orderId,
          })
          const res = (data as any) || {}
          if (!error && res.success) {
            return Response.json(
              { success: true, via: 'db', reason: res.reason ?? null },
              { headers: CORS },
            )

          }
        } catch {
          // fall through to the direct fetch path below
        }

        const cfg = await resolveGreenConfig(supabase)
        const missing = missingGreenFields(cfg)
        if (missing.length) {
          return Response.json(
            { success: false, reason: 'whatsapp_not_configured', missing }, { status: 200, headers: CORS })
        }


        // Works with service role (direct read) or publishable key (security-definer RPC).
        let order: any = null
        let items: any[] = []

        const direct = await supabase
          .from('orders')
          .select(
            'id, customer_name, customer_phone, customer_email, total, payment_method_name, created_at',
          )
          .eq('id', orderId)
          .maybeSingle()

        if (direct.data) {
          order = direct.data
          const { data } = await supabase
            .from('order_items')
            .select('product_name, quantity, unit_price')
            .eq('order_id', orderId)
          items = data || []
        } else {
          const { data } = await supabase.rpc('get_orders_by_ids' as any, { _ids: [orderId] })
          const row = Array.isArray(data) ? (data[0] as any) : null
          if (row) {
            order = row
            items = Array.isArray(row.items) ? row.items : []
          }
        }

        if (!order) {
          return Response.json({ error: 'order_not_found' }, { status: 404, headers: CORS })
        }

        const itemLines = items
          .map(
            (i: any) =>
              `• ${i.product_name} × ${i.quantity} — ${fmtIQD(Number(i.unit_price) * i.quantity)}`,
          )
          .join('\n')

        const message =
          `🛒 *طلب جديد — FPI STOR*\n\n` +
          `🆔 رقم الطلب: ${String(order.id).slice(0, 8).toUpperCase()}\n` +
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
              { status: 502, headers: CORS },
            )
          }
          return Response.json({ success: true, id: (r.body as any)?.idMessage }, { headers: CORS })

        } catch (e: any) {
          return Response.json(
            { success: false, reason: e?.message || 'fetch_failed' }, { status: 502, headers: CORS })
        }
      },
    },
  },
})
