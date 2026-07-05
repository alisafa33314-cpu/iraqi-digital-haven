DROP FUNCTION IF EXISTS public.admin_login(text);

CREATE OR REPLACE FUNCTION public.admin_login(_code text)
RETURNS text
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
      RETURN 'locked:' || wait_secs;
    END IF;
  END IF;

  correct := (encode(extensions.digest(_code,'sha256'),'hex') =
              (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash'));

  IF correct THEN
    INSERT INTO public.site_settings(key,value) VALUES('admin_attempts','0')
      ON CONFLICT (key) DO UPDATE SET value='0', updated_at=now();
    INSERT INTO public.site_settings(key,value) VALUES('admin_lock_until','')
      ON CONFLICT (key) DO UPDATE SET value='', updated_at=now();
    RETURN 'ok';
  END IF;

  SELECT COALESCE(NULLIF(value,'')::int,0) INTO attempts FROM public.site_settings WHERE key='admin_attempts';
  attempts := COALESCE(attempts,0) + 1;

  IF attempts >= 3 THEN
    INSERT INTO public.site_settings(key,value) VALUES('admin_attempts','0')
      ON CONFLICT (key) DO UPDATE SET value='0', updated_at=now();
    INSERT INTO public.site_settings(key,value) VALUES('admin_lock_until',(now() + interval '15 minutes')::text)
      ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();
    RETURN 'locked:900';
  END IF;

  INSERT INTO public.site_settings(key,value) VALUES('admin_attempts',attempts::text)
    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();
  RETURN 'invalid:' || (3 - attempts);
END;
$function$;