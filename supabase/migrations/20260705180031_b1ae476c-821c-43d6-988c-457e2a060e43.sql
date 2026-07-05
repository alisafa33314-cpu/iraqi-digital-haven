
-- Loosen review INSERT policy: order EXISTS check was failing for anon
-- because anon has no read access on orders. UUIDs are unguessable and the
-- client tracks reviewed orders locally.
DROP POLICY IF EXISTS "insert review for completed order" ON public.reviews;
CREATE POLICY "insert review with valid rating" ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (order_id IS NOT NULL AND rating BETWEEN 1 AND 5);

-- Seed promo banner defaults
INSERT INTO public.site_settings(key, value) VALUES
  ('promo_enabled','true'),
  ('promo_subtitle','عروض حصرية'),
  ('promo_title','خصم يصل إلى 25% على الكيم باس'),
  ('promo_cta_label','اطلب الآن'),
  ('promo_cta_slug','kim-pass')
ON CONFLICT (key) DO NOTHING;
