
CREATE OR REPLACE FUNCTION public.admin_login(_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  lock_until_txt text;
  lock_until timestamptz;
  attempts int;
  correct boolean;
  wait_secs int;
BEGIN
  SELECT value INTO lock_until_txt FROM public.site_settings WHERE key='admin_lock_until';
  IF lock_until_txt IS NOT NULL AND lock_until_txt <> '' THEN
    lock_until := lock_until_txt::timestamptz;
    IF now() < lock_until THEN
      wait_secs := ceil(extract(epoch FROM (lock_until - now())))::int;
      RAISE EXCEPTION 'locked:%', wait_secs;
    END IF;
  END IF;

  correct := (encode(extensions.digest(_code,'sha256'),'hex') =
              (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash'));

  IF correct THEN
    UPDATE public.site_settings SET value='0', updated_at=now() WHERE key='admin_attempts';
    UPDATE public.site_settings SET value='', updated_at=now() WHERE key='admin_lock_until';
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(value,'')::int,0) INTO attempts FROM public.site_settings WHERE key='admin_attempts';
  attempts := COALESCE(attempts,0) + 1;
  IF attempts >= 3 THEN
    UPDATE public.site_settings SET value='0', updated_at=now() WHERE key='admin_attempts';
    INSERT INTO public.site_settings(key,value) VALUES('admin_lock_until',(now() + interval '15 minutes')::text)
      ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();
    RAISE EXCEPTION 'locked:900';
  ELSE
    INSERT INTO public.site_settings(key,value) VALUES('admin_attempts',attempts::text)
      ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();
    RAISE EXCEPTION 'invalid:%', (3 - attempts);
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_delete_order(_code text, _order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.admin_check_code(_code);
  DELETE FROM public.order_items WHERE order_id = _order_id;
  DELETE FROM public.orders WHERE id = _order_id;
END; $function$;
