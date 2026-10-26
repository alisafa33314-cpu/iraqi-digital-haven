# Backend connection update

- [x] Point Vercel store back to the original store backend so products load.
- [x] Google sign-in on the store domain returns to https://fpistor.com.
- [x] Redeploy on Vercel: deployed from git main via the Vercel API; live site now reads the store backend and products render.
- [x] Vercel project env vars corrected to the store backend (VITE_SUPABASE_URL / ANON_KEY were pointing at the empty project).
- [ ] Google sign-in on fpistor.com: needs user's own Google Client ID/Secret in Cloud sign-in settings and fpistor.com added to allowed redirect URLs (user action).
- [ ] Verify server-side features on Vercel (order emails, WhatsApp/Telegram notify, uploads) still work with the service-role credential stored in Vercel.
