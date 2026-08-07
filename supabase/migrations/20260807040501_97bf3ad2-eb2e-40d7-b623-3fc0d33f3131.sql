DROP POLICY IF EXISTS "shop-assets admin read all" ON storage.objects;
CREATE POLICY "shop-assets admin read all"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shop-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));