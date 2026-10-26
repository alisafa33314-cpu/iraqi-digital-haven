import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useSession, signInWithGoogle } from "@/lib/auth";
import { cloud as supabase } from "@/lib/cloud-client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Zap } from "lucide-react";

// Origins allowed to receive the session after sign-in on this hosted page
// (the custom domain runs the same app on external hosting).
const ALLOWED_RETURN_HOSTS = new Set(["fpistor.com", "www.fpistor.com"]);

function safeReturnTo(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol === "https:" && ALLOWED_RETURN_HOSTS.has(u.hostname)) return u.origin;
  } catch {
    /* ignore */
  }
  return null;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    return_to: typeof s.return_to === "string" ? s.return_to : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — FPI STOR" },
      { name: "description", content: "سجّل الدخول إلى FPI STOR بحساب جوجل لمتابعة طلباتك بسرعة وأمان." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "تسجيل الدخول — FPI STOR" },
      { property: "og:description", content: "سجّل الدخول بحساب جوجل لمتابعة طلباتك في FPI STOR." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { return_to } = Route.useSearch();
  const returnTo = safeReturnTo(return_to);
  const user = useSession((s) => s.user);
  const ready = useSession((s) => s.ready);
  const [busy, setBusy] = useState(false);

  // Send the established session back to the external origin via URL hash
  // (fragments are never sent to servers; the app there reads them locally).
  const finishWithSession = async () => {
    if (returnTo) {
      const { data } = await supabase.auth.getSession();
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
    }
    nav({ to: "/", replace: true });
  };

  // Already signed in? Go home (or back to the requesting origin).
  useEffect(() => {
    if (ready && user) {
      finishWithSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result.redirected) return; // browser navigates to Google
      // Tokens returned directly (popup flow) — session is set; go home
      toast.success("تم تسجيل الدخول بنجاح");
      await finishWithSession();
    } catch (err: any) {
      toast.error("فشل تسجيل الدخول: " + (err?.message || "خطأ غير معروف"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <Container className="py-16 max-w-md">
        <div className="card-neon rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black mb-2">تسجيل الدخول</h1>
          <p className="text-sm text-muted-foreground mb-6">
            سجّل الدخول لمتابعة طلباتك وحفظ بياناتك للشراء السريع
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-3 hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GoogleIcon className="w-5 h-5" />
            )}
            <span>{busy ? "جاري الاتصال بجوجل…" : "الدخول بحساب جوجل"}</span>
          </button>

          <div className="mt-6 pt-6 border-t border-border space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" /> تسليم فوري • دفع آمن
            </div>
            <div>باستمرارك أنت توافق على <Link to="/" className="text-primary hover:underline">شروط المتجر</Link></div>
          </div>
        </div>
      </Container>
    </Layout>
  );
}
