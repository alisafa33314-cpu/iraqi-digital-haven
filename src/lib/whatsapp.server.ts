import { createClient } from '@supabase/supabase-js'

const CLOUD_URL = 'https://maeniuozqrionnhmssli.supabase.co'
const CLOUD_PUBLISHABLE_KEY = 'sb_publishable_A-6Q--ON6buJy4QrkIHIYA_j_e3JxNO'

/** Env var names the admin can set as a fallback to the settings table. */
export const GREEN_ENV_NAMES = {
  idInstance: 'GREEN_API_ID_INSTANCE',
  apiToken: 'GREEN_API_TOKEN',
  phone: 'GREEN_API_ADMIN_PHONE',
} as const

/** Normalize a phone number for Green API chatId (digits only, Iraq default). */
export function normalizePhone(raw: string): string {
  let d = String(raw || '').replace(/[^\d]/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = '964' + d.replace(/^0+/, '')
  return d
}

export function fmtIQD(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n)) + ' IQD'
}

function keyedFetch(key: string) {
  return (input: any, init: any) => {
    const h = new Headers(init?.headers)
    if (key.startsWith('sb_')) {
      h.delete('Authorization')
      h.set('apikey', key)
    }
    return fetch(input, { ...init, headers: h })
  }
}

/** Service-role client when available, otherwise null. */
export function adminSupabase() {
  const url = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'] || CLOUD_URL
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: keyedFetch(key) },
  })
}

/** Publishable-key client — always available, RLS applies. */
export function publicSupabase() {
  const url = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'] || CLOUD_URL
  const key =
    process.env['SUPABASE_PUBLISHABLE_KEY'] ||
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    CLOUD_PUBLISHABLE_KEY
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: keyedFetch(key) },
  })
}

/** Any usable server client: service role when present, publishable otherwise. */
export function serverSupabase() {
  return adminSupabase() ?? publicSupabase()
}

export type GreenConfig = { idInstance: string; apiToken: string; phone: string }

export type GreenOverrides = Partial<GreenConfig> & { code?: string }

/**
 * Resolve Green API credentials, in priority order:
 * 1. explicit values passed in the request body (admin panel test)
 * 2. the site_settings table (via admin_get_private_settings when a code is given,
 *    or a direct read when service role is available)
 * 3. environment variables GREEN_API_ID_INSTANCE / GREEN_API_TOKEN / GREEN_API_ADMIN_PHONE
 */
export async function resolveGreenConfig(
  supabase: any,
  overrides: GreenOverrides = {},
): Promise<GreenConfig> {
  const s: Record<string, string> = {}

  if (overrides.code) {
    const { data } = await supabase.rpc('admin_get_private_settings', { _code: overrides.code })
    for (const r of (data as any[]) || []) s[r.key] = r.value
  }

  if (!s['greenapi_id_instance']) {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['greenapi_id_instance', 'greenapi_api_token', 'greenapi_admin_phone'])
    for (const r of (data as any[]) || []) if (r.value) s[r.key] = r.value
  }

  return {
    idInstance: String(
      overrides.idInstance || s['greenapi_id_instance'] || process.env[GREEN_ENV_NAMES.idInstance] || '',
    ).trim(),
    apiToken: String(
      overrides.apiToken || s['greenapi_api_token'] || process.env[GREEN_ENV_NAMES.apiToken] || '',
    ).trim(),
    phone: normalizePhone(
      overrides.phone || s['greenapi_admin_phone'] || process.env[GREEN_ENV_NAMES.phone] || '',
    ),
  }
}

/** Back-compat wrapper. */
export async function loadGreenConfig(supabase: any): Promise<GreenConfig> {
  return resolveGreenConfig(supabase)
}

export function missingGreenFields(cfg: GreenConfig) {
  const missing: string[] = []
  if (!cfg.idInstance) missing.push(GREEN_ENV_NAMES.idInstance)
  if (!cfg.apiToken) missing.push(GREEN_ENV_NAMES.apiToken)
  if (!cfg.phone) missing.push(GREEN_ENV_NAMES.phone)
  return missing
}

export async function sendWhatsApp(cfg: GreenConfig, message: string) {
  const url = `https://api.green-api.com/waInstance${cfg.idInstance}/sendMessage/${cfg.apiToken}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${cfg.phone}@c.us`, message }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}
