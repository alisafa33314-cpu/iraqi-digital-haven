-- 1) Fail-closed block check
CREATE OR REPLACE FUNCTION public.is_blocked(_ip text, _phone text, _email text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(btrim(_ip),'') = ''
     AND public.norm_phone(_phone) = ''
     AND coalesce(btrim(_email),'') = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.blocked_entities b
    WHERE (b.type = 'ip'    AND coalesce(btrim(_ip),'') <> ''    AND lower(btrim(b.value)) = lower(btrim(_ip)))
       OR (b.type = 'phone' AND public.norm_phone(_phone) <> ''  AND public.norm_phone(b.value) = public.norm_phone(_phone))
       OR (b.type = 'email' AND coalesce(btrim(_email),'') <> '' AND lower(btrim(b.value)) = lower(btrim(_email)))
  );
EXCEPTION WHEN OTHERS THEN
  -- Fail closed: never allow a bypass because of an internal error
  RETURN true;
END;
$function$;

-- 2) Storage write policies: admin-only for public storefront folders
DROP POLICY IF EXISTS "shop-assets scoped upload" ON storage.objects;

CREATE POLICY "shop-assets admin upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shop-assets'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "shop-assets admin update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'shop-assets' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'shop-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "shop-assets admin delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'shop-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Guests may only drop payment proofs, images only, no overwrite
CREATE POLICY "shop-assets guest payment proof upload" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'shop-assets'
  AND (storage.foldername(name))[1] = 'payment-proofs'
  AND lower(regexp_replace(name, '^.*\.', '')) = ANY (ARRAY['png','jpg','jpeg','webp','gif','avif','heic'])
);
