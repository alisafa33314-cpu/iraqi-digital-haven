import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useSession } from "@/lib/auth";
import { cloud as supabase } from "@/lib/cloud-client";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
// Origins allowed to receive the session after sign-in (the custom domain
// runs the same app on external hosting).
const ALLOWED_RETURN_HOSTS = new Set(["fpistor.com", "www.fpistor.com"]);
const RETURN_KEY = "auth_return_to";
function safeReturnTo(raw: string | null): string | null {
    if (!raw)
        return null;
    try {
        const u = new URL(raw);
        if (u.protocol === "https:" && ALLOWED_RETURN_HOSTS.has(u.hostname))
            return u.origin;
    }
    catch {
        /* ignore */
    }
    return null;
}
// Landing route after Google sign-in: the Supabase client picks up the
// session tokens from the URL hash automatically, then we go home — or hand
// the session back to the external origin that requested the sign-in.
export const Route = createFileRoute("/auth/callback")({
    head: () => ({ meta: [{ title: "جاري تسجيل الدخول — FPI STOR" }, { name: "robots", content: "noindex" },{name:"description", content:"Manage your FPI STOR orders and account."},{property:"og:title", content:"جاري تسجيل الدخول — FPI STOR"},{property:"og:description", content:"Manage your FPI STOR orders and account."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
    component: AuthCallbackPage,
});
function AuthCallbackPage() {
    useLanguage();
    const nav = useNavigate();
    const user = useSession((s) => s.user);
    const ready = useSession((s) => s.ready);
    useEffect(() => {
        if (!ready || !user)
            return;
        const returnTo = safeReturnTo(sessionStorage.getItem(RETURN_KEY));
        sessionStorage.removeItem(RETURN_KEY);
        if (returnTo) {
            supabase.auth.getSession().then(({ data }) => {
                const sess = data.session;
                if (sess) {
                    const hash = new URLSearchParams({
                        access_token: sess.access_token,
                        refresh_token: sess.refresh_token,
                        expires_in: String(sess.expires_in ?? 3600),
                        token_type: sess.token_type ?? "bearer",
                    }).toString();
                    window.location.href = `${returnTo}/auth/callback#${hash}`;
                    return;
                }
                nav({ to: "/", replace: true });
            });
            return;
        }
        nav({ to: "/", replace: true });
    }, [ready, user, nav]);
    return (<Layout>
      <Container className="py-24 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4"/>
        <h1 className="text-xl font-black">{t("\u062C\u0627\u0631\u064A \u0625\u0643\u0645\u0627\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644\u2026")}</h1>
      </Container>
    </Layout>);
}
