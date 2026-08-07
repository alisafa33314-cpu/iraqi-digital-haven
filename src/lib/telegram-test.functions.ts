import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Telegram-only test send. Independent from WhatsApp / Green API and from any
 * admin "code": authorization is the Supabase session + the admin role.
 */
export const telegramTestSend = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { botToken?: string; chatId?: string } | undefined) => ({
    botToken: String(data?.botToken ?? '').trim(),
    chatId: String(data?.chatId ?? '').trim(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any

    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    })
    if (roleError || !isAdmin) {
      console.error('[telegram-test] forbidden:', roleError?.message || 'not admin')
      return { ok: false, error: 'forbidden' }
    }

    const { resolveTelegramConfig, missingTelegramFields, sendTelegramNotice } = await import(
      '@/lib/telegram.server'
    )

    const cfg = await resolveTelegramConfig(supabase, {
      botToken: data.botToken || undefined,
      chatId: data.chatId || undefined,
    })

    if (cfg.mode === 'none') {
      const missing = missingTelegramFields(cfg)
      console.error('[telegram-test] not configured:', missing.join(', '))
      return { ok: false, error: 'telegram_not_configured', missing }
    }

    const res = await sendTelegramNotice(
      cfg,
      '🧪 <b>رسالة اختبار — FPI STOR</b>\nإعدادات إشعارات التليجرام تعمل بنجاح ✅',
    )
    if (!res.ok) console.error('[telegram-test] send failed:', JSON.stringify(res))
    return { mode: cfg.mode, ...res }
  })
