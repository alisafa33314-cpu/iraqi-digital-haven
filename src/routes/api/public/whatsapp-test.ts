import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/whatsapp-test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          serverSupabase,
          resolveGreenConfig,
          sendWhatsApp,
          normalizePhone,
          missingGreenFields,
        } = await import('@/lib/whatsapp.server')

        let body: any = {}
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'invalid_json' }, { status: 400 })
        }

        const code = String(body?.code || '')
        if (!code) return Response.json({ error: 'unauthorized' }, { status: 401 })

        const supabase = serverSupabase()
        const { error: authErr } = await supabase.rpc('admin_check_code' as any, { _code: code })
        if (authErr) return Response.json({ error: 'unauthorized' }, { status: 401 })

        const cfg = await resolveGreenConfig(supabase, {
          code,
          idInstance: body?.idInstance,
          apiToken: body?.apiToken,
          phone: body?.phone,
        })

        const missing = missingGreenFields(cfg)
        if (missing.length) {
          return Response.json(
            {
              success: false,
              reason: 'whatsapp_not_configured',
              missing,
              hint: `أدخل القيم في لوحة التحكم أو أضف المتغيرات: ${missing.join(', ')}`,
            },
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
