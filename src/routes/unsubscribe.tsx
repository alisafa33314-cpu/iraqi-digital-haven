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
          
          
          
          
          
          
        </div>
      </Container>
    </Layout>);
}
