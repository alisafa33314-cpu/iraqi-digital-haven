
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT ON public.order_items TO anon, authenticated;
GRANT ALL ON public.order_items TO service_role;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
