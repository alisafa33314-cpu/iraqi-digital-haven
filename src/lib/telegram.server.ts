/**
 * Telegram notification helpers (server-only).
 *
 * Credentials are resolved in this order:
 *   1. explicit overrides (admin panel test)
 *   2. the site_settings table (telegram_bot_token / telegram_chat_id)
 *   3. environment variables TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
 *   4. Lovable connector gateway (LOVABLE_API_KEY + TELEGRAM_API_KEY)
 *
 * This makes notifications work on any host (Vercel included) even when no
 * environment variables were configured there, as long as the admin saved the
 * bot token + chat id in the dashboard.
 */

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'

export type TelegramConfig = {
  mode: 'direct' | 'gateway' | 'none'
  botToken: string
  chatId: string
  gatewayKeys: { lovable: string; connection: string } | null
}

export type TelegramOverrides = { botToken?: string; chatId?: string; code?: string }

export function fmtIQD(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n)) + ' IQD'
}

export function escHtml(v: unknown) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function safeHttpUrl(u: unknown): string | null {
  try {
    const parsed = new URL(String(u ?? ''))
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export async function resolveTelegramConfig(
  supabase: any,
  overrides: TelegramOverrides = {},
): Promise<TelegramConfig> {
  const s: Record<string, string> = {}

  if (overrides.code) {
    try {
      const { data } = await supabase.rpc('admin_get_private_settings', { _code: overrides.code })
      for (const r of (data as any[]) || []) if (r?.value) s[r.key] = r.value
    } catch (e: any) {
      console.error('[telegram] admin_get_private_settings failed:', e?.message || e)
    }
  }

  if (!s['telegram_bot_token'] || !s['telegram_chat_id']) {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['telegram_bot_token', 'telegram_chat_id'])
      if (error) console.error('[telegram] settings read failed:', error.message)
      for (const r of (data as any[]) || []) if (r?.value) s[r.key] = s[r.key] || r.value
    } catch (e: any) {
      console.error('[telegram] settings read threw:', e?.message || e)
    }
  }

  const botToken = String(
    overrides.botToken || s['telegram_bot_token'] || process.env['TELEGRAM_BOT_TOKEN'] || '',
  ).trim()
  const chatId = String(
    overrides.chatId || s['telegram_chat_id'] || process.env['TELEGRAM_CHAT_ID'] || '',
  ).trim()

  const lovable = String(process.env['LOVABLE_API_KEY'] || '').trim()
  const connection = String(process.env['TELEGRAM_API_KEY'] || '').trim()
  const gatewayKeys = lovable && connection ? { lovable, connection } : null

  const mode: TelegramConfig['mode'] =
    botToken && chatId ? 'direct' : gatewayKeys && chatId ? 'gateway' : 'none'

  return { mode, botToken, chatId, gatewayKeys }
}

export function missingTelegramFields(cfg: TelegramConfig) {
  const missing: string[] = []
  if (!cfg.chatId) missing.push('TELEGRAM_CHAT_ID')
  if (!cfg.botToken && !cfg.gatewayKeys) missing.push('TELEGRAM_BOT_TOKEN')
  return missing
}

function endpoint(cfg: TelegramConfig, method: string) {
  return cfg.mode === 'direct'
    ? `https://api.telegram.org/bot${cfg.botToken}/${method}`
    : `${GATEWAY_URL}/${method}`
}

function headersFor(cfg: TelegramConfig) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cfg.mode === 'gateway' && cfg.gatewayKeys) {
    h.Authorization = `Bearer ${cfg.gatewayKeys.lovable}`
    h['X-Connection-Api-Key'] = cfg.gatewayKeys.connection
  }
  return h
}

/** Low-level Telegram API call with full error logging. */
export async function telegramCall(cfg: TelegramConfig, method: string, payload: any) {
  const url = endpoint(cfg, method)
  const res = await fetch(url, {
    method: 'POST',
    headers: headersFor(cfg),
    body: JSON.stringify({ chat_id: cfg.chatId, ...payload }),
  })
  const raw = await res.text()
  let body: any = {}
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    body = { raw }
  }
  const ok = res.ok && body?.ok !== false
  if (!ok) {
    console.error(
      `[telegram] ${method} failed via ${cfg.mode} — HTTP ${res.status} ${res.statusText}; ` +
        `error_code=${body?.error_code ?? '-'} description=${body?.description ?? raw?.slice(0, 400) ?? '-'}`,
    )
  }
  return { ok, status: res.status, body }
}

/** Sends an HTML message; when a photo URL is given, tries sendPhoto first. */
export async function sendTelegramNotice(
  cfg: TelegramConfig,
  text: string,
  photoUrl?: string | null,
) {
  if (cfg.mode === 'none') {
    console.error('[telegram] not configured — missing:', missingTelegramFields(cfg).join(', '))
    return { ok: false, error: 'telegram_not_configured', missing: missingTelegramFields(cfg) }
  }

  if (photoUrl) {
    const photo = await telegramCall(cfg, 'sendPhoto', {
      photo: photoUrl,
      caption: text,
      parse_mode: 'HTML',
    })
    if (photo.ok) return { ok: true, mode: cfg.mode }
    const fallback = await telegramCall(cfg, 'sendMessage', {
      text: `${text}\n\n🧾 <a href="${escHtml(photoUrl)}">إثبات الدفع</a>`,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    })
    return fallback.ok
      ? { ok: true, mode: cfg.mode, fallback: true }
      : {
          ok: false,
          error: `telegram_${fallback.status}`,
          description: fallback.body?.description ?? null,
        }
  }

  const msg = await telegramCall(cfg, 'sendMessage', { text, parse_mode: 'HTML' })
  return msg.ok
    ? { ok: true, mode: cfg.mode }
    : { ok: false, error: `telegram_${msg.status}`, description: msg.body?.description ?? null }
}
