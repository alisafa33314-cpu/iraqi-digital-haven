import { createFileRoute } from '@tanstack/react-router'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export const Route = createFileRoute('/api/public/new-order-telegram')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
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

        try {
          const { isChannelEnabled } = await import('@/lib/notify-settings.server')
          if (!(await isChannelEnabled('notify_admin_telegram'))) {
            console.error('[telegram] channel disabled in dashboard settings')
            return Response.json({ success: false, reason: 'channel_disabled' }, { headers: CORS })
          }

          const { serverSupabase } = await import('@/lib/whatsapp.server')
          const {
            resolveTelegramConfig,
            missingTelegramFields,
            sendTelegramNotice,
            fmtIQD,
            escHtml,
            safeHttpUrl,
          } = await import('@/lib/telegram.server')

          const supabase = serverSupabase()
          const cfg = await resolveTelegramConfig(supabase)
          if (cfg.mode === 'none') {
            const missing = missingTelegramFields(cfg)
            console.error('[telegram] missing credentials:', missing.join(', '))
            return Response.json(
              { success: false, reason: 'telegram_not_configured', missing },
              { headers: CORS },
            )
          }

          let order: any = null
          let items: any[] = []

          const direct = await supabase
            .from('orders')
            .select(
              'id, customer_name, customer_phone, customer_email, total, payment_method_name, payment_proof_url, created_at',
            )
            .eq('id', orderId)
            .maybeSingle()

          if (direct.data) {
            order = direct.data
            const { data: rows } = await supabase
              .from('order_items')
              .select('product_name, quantity, unit_price')
              .eq('order_id', orderId)
            items = rows || []
          } else {
            if (direct.error)
              console.error('[telegram] direct order read failed:', direct.error.message)
            const { data: rows, error } = await supabase.rpc('get_orders_by_ids' as any, {
              _ids: [orderId],
            })
            if (error) console.error('[telegram] get_orders_by_ids failed:', error.message)
            const row = Array.isArray(rows) ? (rows[0] as any) : null
            if (row) {
              order = row
              items = Array.isArray(row.items) ? row.items : []
            }
          }

          if (!order) {
            console.error('[telegram] order not found:', orderId)
            return Response.json({ error: 'order_not_found' }, { status: 404, headers: CORS })
          }

          const shortId = String(order.id).slice(0, 8).toUpperCase()
          const itemsLines = (items || [])
            .map(
              (i: any) =>
                `• ${escHtml(i.product_name)} × ${i.quantity} — ${fmtIQD(Number(i.unit_price) * Number(i.quantity))}`,
            )
            .join('\n')

          const caption =
            `🛒 <b>طلب جديد — FPI STOR</b>\n\n` +
            `🆔 <code>#${shortId}</code>\n` +
            `👤 ${escHtml(order.customer_name)}\n` +
            `📞 <code>${escHtml(order.customer_phone)}</code>\n` +
            (order.customer_email ? `✉️ ${escHtml(order.customer_email)}\n` : '') +
            `💳 ${escHtml(order.payment_method_name || '—')}\n\n` +
            `<b>المنتجات:</b>\n${itemsLines || '—'}\n\n` +
            `💰 <b>الإجمالي:</b> ${fmtIQD(Number(order.total))}`

          const res = await sendTelegramNotice(cfg, caption, safeHttpUrl(order.payment_proof_url))
          if (!res.ok) {
            console.error('[telegram] order notice failed:', JSON.stringify(res))
            return Response.json({ success: false, reason: res, }, { status: 502, headers: CORS })
          }
          return Response.json({ success: true }, { headers: CORS })
        } catch (e: any) {
          console.error('[telegram] handler threw:', e?.message || e)
          return Response.json(
            { success: false, reason: 'send_failed', description: String(e?.message || e) },
            { status: 502, headers: CORS },
          )
        }
      },
    },
  },
})
