import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { sendTemplateEmailInternal } from '@/lib/email/send-internal.server'

export const Route = createFileRoute('/api/public/order-email')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'server_configuration_error' }, { status: 500 })
        }

        let code: string, orderId: string
        try {
          const body = await request.json()
          code = String(body.code || '')
          orderId = String(body.orderId || '')
        } catch {
          return Response.json({ error: 'invalid_json' }, { status: 400 })
        }
        if (!code || !orderId) {
          return Response.json({ error: 'missing_fields' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, serviceKey)

        // Authorize: admin code must match the stored hash
        const { error: authError } = await supabase.rpc('admin_check_code' as any, { _code: code })
        if (authError) return Response.json({ error: 'unauthorized' }, { status: 401 })

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select(
            'id, customer_name, customer_email, total, status, subscription_info, subscription_image_urls, subscription_image_url',
          )
          .eq('id', orderId)
          .maybeSingle()

        if (orderError || !order) return Response.json({ error: 'order_not_found' }, { status: 404 })
        if (order.status !== 'completed') {
          return Response.json({ error: 'order_not_completed' }, { status: 400 })
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

        if (!result.ok) return Response.json({ success: false, reason: result.error }, { status: 502 })
        return Response.json({ success: true })
      },
    },
  },
})
