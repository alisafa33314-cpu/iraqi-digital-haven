DROP POLICY IF EXISTS "public read non-sensitive settings" ON public.site_settings;
CREATE POLICY "public read non-sensitive settings" ON public.site_settings
FOR SELECT USING (
  key <> ALL (ARRAY['admin_code_hash','admin_attempts','admin_lock_until','greenapi_id_instance','greenapi_api_token','greenapi_admin_phone','telegram_bot_token','telegram_chat_id']::text[])
);

CREATE OR REPLACE FUNCTION public.admin_get_private_settings(_code text)
 RETURNS TABLE(key text, value text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.admin_check_code(_code);
  RETURN QUERY
    SELECT s.key, s.value FROM public.site_settings s
    WHERE s.key IN ('greenapi_id_instance','greenapi_api_token','greenapi_admin_phone','telegram_bot_token','telegram_chat_id');
END; $function$;