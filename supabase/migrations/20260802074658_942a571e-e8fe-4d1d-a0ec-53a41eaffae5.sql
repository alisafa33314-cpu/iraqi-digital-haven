DROP POLICY IF EXISTS "public read non-sensitive settings" ON public.site_settings;
CREATE POLICY "public read non-sensitive settings" ON public.site_settings
  FOR SELECT USING (
    key <> ALL (ARRAY['admin_code_hash','admin_attempts','admin_lock_until',
      'greenapi_id_instance','greenapi_api_token','greenapi_admin_phone'])
  );

CREATE OR REPLACE FUNCTION public.admin_get_private_settings(_code text)
RETURNS TABLE(key text, value text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  RETURN QUERY
    SELECT s.key, s.value FROM public.site_settings s
    WHERE s.key IN ('greenapi_id_instance','greenapi_api_token','greenapi_admin_phone');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_setting(_code text, _key text, _value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  IF _key IN ('admin_code_hash','admin_attempts','admin_lock_until') THEN
    RAISE EXCEPTION 'مفتاح محجوز';
  END IF;
  INSERT INTO public.site_settings(key, value) VALUES (_key, _value)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END; $$;