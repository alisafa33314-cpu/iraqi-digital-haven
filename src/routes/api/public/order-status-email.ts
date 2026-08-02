import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

/**
 * Called by the database trigger on public.orders when status becomes
 * 'completed' / 'delivered'. Authenticated with the service-role key
 * (stored in Vault as email_queue_service_role_key).
 */
export const Route = createFileRoute('/api/public/order-status-email')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { sendTemplateEmailInternal } = await import('@/lib/email/send-internal.server')
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'server_configuration_error' }, { status: 500 })
        }

        const auth = request.headers.get('Authorization') || ''
        if (!auth.startsWith('Bearer ') || auth.slice(7).trim() !== serviceKey) {
          return Response.json({ error: 'unauthorized' }, { status: 401 })
        }

        let orderId = ''
        try {
          const body = await request.json()
          orderId = String(body?.orderId ?? body?.record?.id ?? '')
        } catch {
          return Response.json({ error: 'invalid_json' }, { status: 400 })
        }
        if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
          return Response.json({ error: 'invalid_order_id' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, serviceKey)

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select(
            'id, customer_name, customer_email, total, status, subscription_info, subscription_image_urls, subscription_image_url',
          )
          .eq('id', orderId)
          .maybeSingle()

        if (orderError || !order) return Response.json({ error: 'order_not_found' }, { status: 404 })
        if (!['completed', 'delivered'].includes(String(order.status))) {
          return Response.json({ success: false, reason: 'order_not_completed' })
        }
        if (!order.customer_email) {
          return Response.json({ success: false, reason: 'no_email' })
        }

        const { data: items } = await supabase
          .from('order_items')
          .select('product_name, quantity, unit_price')
          .eq('order_id', orderId)

        const images =
          (order.subscription_image_urls && order.subscription_image_urls.length > 0
            ? order.subscription_image_urls
            : order.subscription_image_url
              ? [order.subscription_image_url]
              : []) ?? []

        const result = await sendTemplateEmailInternal({
          templateName: 'order-delivered',
          recipientEmail: order.customer_email,
          idempotencyKey: `order-delivered-${orderId}`,
          templateData: {
            orderId: order.id,
            customerName: order.customer_name,
            subscriptionInfo: order.subscription_info || '',
            images,
            items: (items || []).map((i: any) => ({
              name: i.product_name,
              qty: i.quantity,
              price: Number(i.unit_price),
            })),
            total: Number(order.total),
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
