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

- Customer auth uses the Lovable managed Google OAuth flow (`lovable.auth.signInWithOAuth` from `src/integrations/lovable`, `redirect_uri = window.location.origin`). Never call raw `supabase.auth.signInWithOAuth({ provider: "google" })` — the managed broker handles the iframe-safe web_message flow in the preview.
- Session state lives in the `useSession` zustand store (`src/lib/auth.ts`); its `init()` registers the single app-wide `onAuthStateChange` subscriber and is called once from `src/routes/__root.tsx`. Do not add competing auth listeners.
- Signed-in orders are linked by writing `user_id` on the `orders` insert in checkout; the orders page merges account orders (`user_id = auth.uid()`) with localStorage order ids.
- Admin customer listing goes through the `admin_list_customers` / `admin_count_customers` SECURITY DEFINER RPCs (same `_code` + `has_role` pattern as the other admin functions) so admins can read all profiles without widening profile RLS.
