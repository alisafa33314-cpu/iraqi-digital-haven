import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/whatsapp-test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { adminSupabase, loadGreenConfig, sendWhatsApp, normalizePhone } = await import(
          '@/lib/whatsapp.server'
        )

        const supabase = adminSupabase()
        if (!supabase) {
          return Response.json({ error: 'server_configuration_error' }, { status: 500 })
        }

        let code = ''
        try {
          const body = await request.json()
          code = String((body as any)?.code || '')
        } catch {
          return Response.json({ error: 'invalid_json' }, { status: 400 })
        }
        if (!code) return Response.json({ error: 'unauthorized' }, { status: 401 })

        const { error: authErr } = await supabase.rpc('admin_check_code', { _code: code })
        if (authErr) return Response.json({ error: 'unauthorized' }, { status: 401 })

        const cfg = await loadGreenConfig(supabase)
        if (!cfg.idInstance || !cfg.apiToken || !cfg.phone) {
          return Response.json(
            { success: false, reason: 'whatsapp_not_configured' },
            { status: 200 },
          )
        }

        const message =
          `✅ *رسالة اختبار — FPI STOR*\n\n` +
          `تم الاتصال بنجاح مع Green API.\n` +
          `الرقم: ${normalizePhone(cfg.phone)}\n` +
          `الوقت: ${new Date().toISOString()}`

        try {
          const r = await sendWhatsApp(cfg, message)
          return Response.json(
            {
              success: r.ok,
              reason: r.ok ? undefined : `greenapi_${r.status}`,
              chatId: `${cfg.phone}@c.us`,
              body: r.body,
            },
            { status: r.ok ? 200 : 502 },
          )
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
