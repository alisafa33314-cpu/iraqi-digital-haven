GRANT SELECT ON TABLE public.products TO anon, authenticated;
GRANT ALL ON TABLE public.products TO service_role;

GRANT SELECT ON TABLE public.categories TO anon, authenticated;
GRANT ALL ON TABLE public.categories TO service_role;

GRANT SELECT ON TABLE public.payment_methods TO anon, authenticated;
GRANT ALL ON TABLE public.payment_methods TO service_role;

GRANT SELECT ON TABLE public.social_links TO anon, authenticated;
GRANT ALL ON TABLE public.social_links TO service_role;

GRANT SELECT ON TABLE public.store_images TO anon, authenticated;
GRANT ALL ON TABLE public.store_images TO service_role;

GRANT SELECT, INSERT ON TABLE public.reviews TO anon, authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;

GRANT SELECT ON TABLE public.site_settings TO anon, authenticated;
GRANT ALL ON TABLE public.site_settings TO service_role;