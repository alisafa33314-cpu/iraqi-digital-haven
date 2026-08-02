import { createClient } from '@supabase/supabase-js'

/** Normalize a phone number for Green API chatId (digits only, Iraq default). */
export function normalizePhone(raw: string): string {
  let d = String(raw || '').replace(/[^\d]/g, '')
  // remove international prefix 00
  if (d.startsWith('00')) d = d.slice(2)
  // local Iraqi format 07xx... -> 9647xx...
  if (d.startsWith('0')) d = '964' + d.replace(/^0+/, '')
  return d
}

export function fmtIQD(n: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(n)) + ' IQD'
}

export function adminSupabase() {
  const url = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers)
        if (key.startsWith('sb_')) {
          h.delete('Authorization')
          h.set('apikey', key)
        }
        return fetch(input, { ...init, headers: h })
      },
    },
  })
}

export type GreenConfig = { idInstance: string; apiToken: string; phone: string }

export async function loadGreenConfig(supabase: any): Promise<GreenConfig> {
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['greenapi_id_instance', 'greenapi_api_token', 'greenapi_admin_phone'])
  const s: Record<string, string> = {}
  for (const r of data || []) s[r.key] = r.value
  return {
    idInstance: (s['greenapi_id_instance'] || '').trim(),
    apiToken: (s['greenapi_api_token'] || '').trim(),
    phone: normalizePhone(s['greenapi_admin_phone'] || ''),
  }
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
