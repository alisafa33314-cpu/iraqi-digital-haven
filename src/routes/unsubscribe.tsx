import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Layout, Container } from '@/components/Layout';
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
});
type State = 'loading' | 'valid' | 'already' | 'invalid' | 'done' | 'error';
function UnsubscribePage() {
    useLanguage();
    const [state, setState] = useState<State>('loading');
    const [busy, setBusy] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    useEffect(() => {
        const t = new URLSearchParams(window.location.search).get('token');
        setToken(t);
        if (!t)
            return setState('invalid');
        fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
            .then((r) => r.json())
            .then((d) => {
            if (d.valid)
                setState('valid');
            else if (d.reason === 'already_unsubscribed')
                setState('already');
            else
                setState('invalid');
        })
            .catch(() => setState('error'));
    }, []);
    const confirm = async () => {
        if (!token)
            return;
        setBusy(true);
        try {
            const res = await fetch('/email/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const d = await res.json();
            if (d.success)
                setState('done');
            else if (d.reason === 'already_unsubscribed')
                setState('already');
            else
                setState('error');
        }
        catch {
            setState('error');
        }
        finally {
            setBusy(false);
        }
    };
    return (<Layout>
      <Container className="py-20">
        <div className="card-neon rounded-2xl p-8 max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-black">{t("\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0645\u0646 \u0627\u0644\u0631\u0633\u0627\u0626\u0644")}</h1>
          {state === 'loading' && <p className="text-muted-foreground">{t("\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0642\u0642\u2026")}</p>}
          {state === 'valid' && (<>
              <p className="text-sm text-muted-foreground">{t(" \u0647\u0644 \u062A\u0631\u064A\u062F \u0625\u064A\u0642\u0627\u0641 \u0627\u0633\u062A\u0644\u0627\u0645 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0646 FPI STOR\u061F ")}</p>
              <button onClick={confirm} disabled={busy} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
                {busy ? t('جاري التنفيذ…') : t('تأكيد إلغاء الاشتراك')}
              </button>
            </>)}
          {state === 'already' && <p className="text-sm text-muted-foreground">{t("\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0634\u062A\u0631\u0627\u0643\u0643 \u0645\u0633\u0628\u0642\u0627\u064B.")}</p>}
          {state === 'done' && <p className="text-sm text-green-400 font-bold">{t("\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0628\u0646\u062C\u0627\u062D.")}</p>}
          {state === 'invalid' && <p className="text-sm text-red-400">{t("\u0627\u0644\u0631\u0627\u0628\u0637 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629.")}</p>}
          {state === 'error' && <p className="text-sm text-red-400">{t("\u062D\u062F\u062B \u062E\u0637\u0623\u060C \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0644\u0627\u062D\u0642\u0627\u064B.")}</p>}
        </div>
      </Container>
    </Layout>);
}
