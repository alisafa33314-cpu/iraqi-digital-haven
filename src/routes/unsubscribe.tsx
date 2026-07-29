import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Layout, Container } from '@/components/Layout'

export const Route = createFileRoute('/unsubscribe')({
  head: () => ({
    meta: [
      { title: 'إلغاء الاشتراك من الرسائل — FPI STOR' },
      { name: 'description', content: 'إلغاء الاشتراك من رسائل البريد الإلكتروني الخاصة بمتجر FPI STOR.' },
      { name: 'robots', content: 'noindex' },
      { property: 'og:title', content: 'إلغاء الاشتراك — FPI STOR' },
      { property: 'og:description', content: 'إدارة تفضيلات البريد الإلكتروني في FPI STOR.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: UnsubscribePage,
})

type State = 'loading' | 'valid' | 'already' | 'invalid' | 'done' | 'error'

function UnsubscribePage() {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token')
    setToken(t)
    if (!t) return setState('invalid')
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setState('valid')
        else if (d.reason === 'already_unsubscribed') setState('already')
        else setState('invalid')
      })
      .catch(() => setState('error'))
  }, [])

  const confirm = async () => {
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await res.json()
      if (d.success) setState('done')
      else if (d.reason === 'already_unsubscribed') setState('already')
      else setState('error')
    } catch {
      setState('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout>
      <Container className="py-20">
        <div className="card-neon rounded-2xl p-8 max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-black">إلغاء الاشتراك من الرسائل</h1>
          {state === 'loading' && <p className="text-muted-foreground">جاري التحقق…</p>}
          {state === 'valid' && (
            <>
              <p className="text-sm text-muted-foreground">
                هل تريد إيقاف استلام رسائل البريد الإلكتروني من FPI STOR؟
              </p>
              <button
                onClick={confirm}
                disabled={busy}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60"
              >
                {busy ? 'جاري التنفيذ…' : 'تأكيد إلغاء الاشتراك'}
              </button>
            </>
          )}
          {state === 'already' && <p className="text-sm text-muted-foreground">تم إلغاء اشتراكك مسبقاً.</p>}
          {state === 'done' && <p className="text-sm text-green-400 font-bold">تم إلغاء الاشتراك بنجاح.</p>}
          {state === 'invalid' && <p className="text-sm text-red-400">الرابط غير صالح أو منتهي الصلاحية.</p>}
          {state === 'error' && <p className="text-sm text-red-400">حدث خطأ، حاول مرة أخرى لاحقاً.</p>}
        </div>
      </Container>
    </Layout>
  )
}
