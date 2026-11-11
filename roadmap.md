# Admin panel

- [x] Visitor-stats section collapsible with a chevron; open/closed state saved per device.

# Orders page

- [x] Horizontal 3-step status bar per order (قيد التنفيذ ← جاري التجهيز ← مكتمل): done steps red with a check, current step pulses lightly.
- [x] Rejected orders show a red badge with the rejection reason instead of the steps; admin can type that reason when rejecting.
- [x] Admin orders panel: live search by order number (accepts # or no #, any case, with or without dashes), with a clear button and a "no such order" message.

# Backend connection update

- [x] Point Vercel store back to the original store backend so products load.
- [x] Google sign-in on the store domain returns to https://fpistor.com.
- [x] Redeploy on Vercel: deployed from git main via the Vercel API; live site now reads the store backend and products render.
- [x] Vercel project env vars corrected to the store backend (VITE_SUPABASE_URL / ANON_KEY were pointing at the empty project).
- [ ] Google sign-in on fpistor.com: needs user's own Google Client ID/Secret in Cloud sign-in settings and fpistor.com added to allowed redirect URLs (user action).
- [ ] Verify server-side features on Vercel (order emails, WhatsApp/Telegram notify, uploads) still work with the service-role credential stored in Vercel.
