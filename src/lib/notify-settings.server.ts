import { createClient } from '@supabase/supabase-js'

export type NotifyChannel =
  | 'notify_customer_email'
  | 'notify_customer_inapp'
  | 'notify_admin_whatsapp'
  | 'notify_admin_telegram'
  | 'notify_admin_email'

/**
 * Reads a notification toggle from site_settings (public, non-sensitive flags).
 * Defaults to enabled when the key was never saved.
 */
export async function isChannelEnabled(key: NotifyChannel): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!url || !anon) return true

  try {
    const client = createClient(url, anon, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers)
          if (anon.startsWith('sb_') && headers.get('Authorization') === `Bearer ${anon}`) {
            headers.delete('Authorization')
          }
          headers.set('apikey', anon)
          return fetch(input as any, { ...init, headers })
        },
      },
    })

    const { data } = await client
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    return (data as any)?.value !== 'false'
  } catch {
    return true
  }
}
