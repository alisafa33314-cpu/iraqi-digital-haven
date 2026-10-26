<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Vercel public backend settings are declared in vercel.json for build and runtime, but the Vercel project's own dashboard environment variables win at build time — keep both pointing at the same store backend and never mix a URL from one project with a key from another; deployment environment variables also take precedence over managed .env defaults in vite.config.ts. Custom clients resolve their URL and public key from environment together, never hardcoded old-project fallbacks — why: external deployments must not mix backend identities with Lovable Cloud.
- Vercel privileged server operations require a server-only service-role credential belonging to the external project; never reuse the managed Cloud credential or expose it through VITE variables — why: public connection settings do not migrate privileged access.
- Customer auth uses the Lovable managed Google OAuth flow (`lovable.auth.signInWithOAuth`) on Lovable-hosted origins; only on the externally hosted custom domain (Vercel, no /~oauth broker) `signInWithGoogle` falls back to native `supabase.auth.signInWithOAuth` — why: the broker path does not exist off Lovable hosting.
- Session state lives in the `useSession` zustand store (`src/lib/auth.ts`); its `init()` registers the single app-wide `onAuthStateChange` subscriber and is called once from `src/routes/__root.tsx`. Do not add competing auth listeners.
- Signed-in orders are linked by writing `user_id` on the `orders` insert in checkout; the orders page merges account orders (`user_id = auth.uid()`) with localStorage order ids.
- Admin customer listing goes through the `admin_list_customers` / `admin_count_customers` SECURITY DEFINER RPCs (same `_code` + `has_role` pattern as the other admin functions) so admins can read all profiles without widening profile RLS.
