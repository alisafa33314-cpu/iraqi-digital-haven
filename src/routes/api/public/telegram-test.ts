import { createFileRoute } from '@tanstack/react-router'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export const Route = createFileRoute('/api/public/telegram-test')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: any = {}
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'invalid_json' }, { status: 400, headers: CORS })
        }

        const code = String(body?.code || '')
        if (!code) return Response.json({ error: 'missing_code' }, { status: 401, headers: CORS })

        const { serverSupabase } = await import('@/lib/whatsapp.server')
        const supabase = serverSupabase()

        // admin_check_code inside this RPC throws for a wrong/locked code.
        const auth = await supabase.rpc('admin_get_private_settings' as any, { _code: code })
        if (auth.error) {
          return Response.json({ error: 'unauthorized' }, { status: 401, headers: CORS })
        }

        const { resolveTelegramConfig, missingTelegramFields, sendTelegramNotice } = await import(
          '@/lib/telegram.server'
        )

        const cfg = await resolveTelegramConfig(supabase, {
          code,
          botToken: body?.botToken ? String(body.botToken) : undefined,
          chatId: body?.chatId ? String(body.chatId) : undefined,
        })

        if (cfg.mode === 'none') {
          const missing = missingTelegramFields(cfg)
          console.error('[telegram-test] not configured:', missing.join(', '))
          return Response.json(
            { success: false, reason: 'telegram_not_configured', missing },
            { headers: CORS },
          )
        }

        const res = await sendTelegramNotice(
          cfg,
          '🧪 <b>رسالة اختبار — FPI STOR</b>\nإعدادات إشعارات التليجرام تعمل بنجاح ✅',
        )

        return Response.json(
          { success: res.ok, mode: cfg.mode, ...res },
          { status: res.ok ? 200 : 502, headers: CORS },
        )
      },
    },
  },
})
