import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fmtIQD(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n)) + ' IQD'
}

export const Route = createFileRoute('/api/public/new-order-whatsapp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'server_configuration_error' }, { status: 500 })
        }

        let orderId = ''
        try {
          const body = await request.json()
          orderId = String(body?.orderId || '')
        } catch {
          return Response.json({ error: 'invalid_json' }, { status: 400 })
        }
        if (!UUID_RE.test(orderId)) {
          return Response.json({ error: 'invalid_order_id' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, serviceKey)

        const { data: settingsRows } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', ['greenapi_id_instance', 'greenapi_api_token', 'greenapi_admin_phone'])

        const settings: Record<string, string> = {}
        for (const r of settingsRows || []) settings[(r as any).key] = (r as any).value

        const idInstance = (settings['greenapi_id_instance'] || '').trim()
        const apiToken = (settings['greenapi_api_token'] || '').trim()
        const phone = (settings['greenapi_admin_phone'] || '').replace(/[^\d]/g, '')

        if (!idInstance || !apiToken || !phone) {
          return Response.json({ success: false, reason: 'whatsapp_not_configured' }, { status: 200 })
        }

        const { data: order, error } = await supabase
          .from('orders')
          .select(
            'id, customer_name, customer_phone, customer_email, total, payment_method_name, created_at',
          )
          .eq('id', orderId)
          .maybeSingle()

        if (error || !order) return Response.json({ error: 'order_not_found' }, { status: 404 })

        // Only notify for freshly created orders (guards against replay).
        if (Date.now() - new Date(order.created_at).getTime() > 15 * 60 * 1000) {
          return Response.json({ success: false, reason: 'order_too_old' }, { status: 400 })
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
          const res = await fetch(
            `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
            },
          )
          const body = await res.json().catch(() => ({}))
          if (!res.ok) {
            return Response.json({ success: false, reason: `greenapi_${res.status}`, body }, { status: 502 })
          }
          return Response.json({ success: true, id: (body as any)?.idMessage })
        } catch (e: any) {
          return Response.json({ success: false, reason: e?.message || 'fetch_failed' }, { status: 502 })
        }
      },
    },
  },
})
