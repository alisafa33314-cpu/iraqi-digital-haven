-- Public read tables
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.social_links TO anon, authenticated;
GRANT SELECT ON public.store_images TO anon, authenticated;

-- Admin-managed writes (RLS restricts to admins)
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;

-- Orders: guests and users can create; users read their own
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT INSERT ON public.order_items TO anon, authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT INSERT ON public.reviews TO anon, authenticated;

-- User-scoped tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Service role for server-side code
GRANT ALL ON public.products, public.categories, public.payment_methods,
  public.reviews, public.site_settings, public.social_links, public.store_images,
  public.orders, public.order_items, public.profiles, public.user_roles TO service_role;
