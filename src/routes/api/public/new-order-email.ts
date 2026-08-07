import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'netflxstor@gmail.com'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/api/public/new-order-email')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isChannelEnabled } = await import('@/lib/notify-settings.server')
        if (!(await isChannelEnabled('notify_admin_email'))) {
          return Response.json({ success: false, reason: 'channel_disabled' })
        }
        const { sendTemplateEmailInternal } = await import('@/lib/email/send-internal.server')
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

        // The order must already exist in the database (inserted at checkout).
        const { data: order, error } = await supabase
          .from('orders')
          .select(
            'id, customer_name, customer_phone, customer_email, total, payment_method_name, payment_proof_url, created_at',
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

        const result = await sendTemplateEmailInternal({
          templateName: 'new-order-admin',
          recipientEmail: ADMIN_EMAIL,
          idempotencyKey: `new-order-${orderId}`,
          templateData: {
            orderId: order.id,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            customerEmail: order.customer_email || '',
            paymentMethod: order.payment_method_name || '',
            proofUrl: order.payment_proof_url || '',
            total: Number(order.total),
            items: (items || []).map((i: any) => ({
              name: i.product_name,
              qty: i.quantity,
              price: Number(i.unit_price),
            })),
          },
        })

        if (!result.ok) {
          return Response.json({ success: false, reason: result.error }, { status: 502 })
        }
        return Response.json({ success: true })
      },
    },
  },
})
