import { createClient } from '@supabase/supabase-js'

export type NotifyChannel =
  | 'notify_customer_email'
  | 'notify_customer_inapp'
  | 'notify_admin_whatsapp'
  | 'notify_admin_telegram'
  | 'notify_admin_email'

export const NOTIFY_CHANNELS: NotifyChannel[] = [
  'notify_customer_email',
  'notify_customer_inapp',
  'notify_admin_whatsapp',
  'notify_admin_telegram',
  'notify_admin_email',
]

function serverClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anon =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  const key = service || anon
  if (!url || !key) return null

  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers)
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) {
          headers.delete('Authorization')
        }
        headers.set('apikey', key)
        return fetch(input as any, { ...init, headers })
      },
    },
  })
}

/**
 * Fetches every notification toggle from site_settings in one round-trip.
 * A key that was never saved defaults to enabled.
 */
export async function getNotifySettings(): Promise<Record<NotifyChannel, boolean>> {
  const defaults = Object.fromEntries(NOTIFY_CHANNELS.map((k) => [k, true])) as Record<
    NotifyChannel,
    boolean
  >

  const client = serverClient()
  if (!client) {
    console.warn('[notify-settings] missing Supabase env; defaulting all channels to enabled')
    return defaults
  }

  const { data, error } = await client
    .from('site_settings')
    .select('key, value')
    .in('key', NOTIFY_CHANNELS)

  if (error) {
    console.error('[notify-settings] failed to read settings:', error.message)
    return defaults
  }

  const out = { ...defaults }
  for (const row of (data || []) as { key: string; value: string }[]) {
    if ((NOTIFY_CHANNELS as string[]).includes(row.key)) {
      out[row.key as NotifyChannel] = String(row.value).trim().toLowerCase() !== 'false'
    }
  }
  return out
}

/**
 * Reads a single notification toggle. Defaults to enabled when never saved.
 */
export async function isChannelEnabled(key: NotifyChannel): Promise<boolean> {
  const settings = await getNotifySettings()
  return settings[key]
}
