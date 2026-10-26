import { create } from "zustand";
import { cloud as supabase } from "./cloud-client";

// Single source of truth for the signed-in customer session.
// One onAuthStateChange subscriber lives here (init) — never add more.
export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type AuthState = {
  user: SessionUser | null;
  ready: boolean;
  setUser: (u: SessionUser | null) => void;
  init: () => void;
};

function toUser(u: any): SessionUser | null {
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email ?? null,
    name: meta.full_name || meta.name || meta.user_name || null,
    avatarUrl: meta.avatar_url || meta.picture || null,
  };
}

export const useSession = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setUser: (user) => set({ user, ready: true }),
  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ user: toUser(data.session?.user), ready: true });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      // Filtered to identity transitions; TOKEN_REFRESHED/INITIAL_SESSION are ignored
      set({ user: toUser(session?.user), ready: true });
    });
  },
}));

// Managed Google OAuth via the Lovable broker (iframe-safe in the preview).
// redirect_uri must be a full same-origin public URL.
// The broker path (/~oauth) only exists on Lovable-hosted domains. On the
// custom domain (fpistor.com, hosted externally) we send the user through the
// published Lovable site's sign-in page, which returns the session tokens.
const MANAGED_HOST_RE = /(^|\.)lovable\.app$|^localhost$|^127\.0\.0\.1$/;
const PUBLISHED_AUTH_URL = "https://iraqi-digital-haven.lovable.app/auth";

export async function signInWithGoogle(): Promise<{ redirected: boolean }> {
  if (!MANAGED_HOST_RE.test(window.location.hostname)) {
    const returnTo = encodeURIComponent(window.location.origin);
    window.location.href = `${PUBLISHED_AUTH_URL}?return_to=${returnTo}`;
    return { redirected: true };
  }
  const { lovable } = await import("@/integrations/lovable");
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: `${window.location.origin}/auth/callback`,
  });
  if (result.error) throw result.error;
  return { redirected: !!result.redirected };
}

export async function signOutCustomer() {
  await supabase.auth.signOut();
  useSession.getState().setUser(null);
}
