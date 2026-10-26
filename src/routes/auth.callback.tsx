import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useSession } from "@/lib/auth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Landing route after Google sign-in: the Supabase client picks up the
// session tokens from the URL hash automatically, then we go home.
export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "جاري تسجيل الدخول — FPI STOR" }, { name: "robots", content: "noindex" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const nav = useNavigate();
  const user = useSession((s) => s.user);
  const ready = useSession((s) => s.ready);

  useEffect(() => {
    if (ready && user) nav({ to: "/", replace: true });
  }, [ready, user, nav]);

  return (
    <Layout>
      <Container className="py-24 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
        <h1 className="text-xl font-black">جاري إكمال تسجيل الدخول…</h1>
      </Container>
    </Layout>
  );
}
