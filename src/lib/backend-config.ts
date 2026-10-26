export function resolvePublicBackend(env: Record<string, string | undefined>) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing backend URL or public key");
  return { url, key };
}

export function googleOAuthRedirect(origin: string) {
  const url = new URL(origin);
  if (url.hostname === "fpistor.com" || url.hostname === "www.fpistor.com") {
    return "https://fpistor.com";
  }
  return `${url.origin}/auth/callback`;
}