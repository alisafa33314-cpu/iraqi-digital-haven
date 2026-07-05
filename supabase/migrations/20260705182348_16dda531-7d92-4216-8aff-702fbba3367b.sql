
-- 1) site_settings: hide sensitive admin keys from public reads
DROP POLICY IF EXISTS "public read settings" ON public.site_settings;
CREATE POLICY "public read non-sensitive settings"
  ON public.site_settings
  FOR SELECT
  USING (key NOT IN ('admin_code_hash', 'admin_attempts', 'admin_lock_until'));

-- 2) shop-assets storage: remove blanket update/delete; keep read + insert only
DROP POLICY IF EXISTS "shop-assets anyone delete" ON storage.objects;
DROP POLICY IF EXISTS "shop-assets anyone update" ON storage.objects;
