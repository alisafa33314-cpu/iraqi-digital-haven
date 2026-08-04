-- 1) Blocked check helper (server-side, used by RLS)
CREATE OR REPLACE FUNCTION public.norm_phone(_p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN v LIKE '00%' THEN substr(v,3)
    WHEN v LIKE '0%' THEN '964' || ltrim(v,'0')
    ELSE v
  END
  FROM (SELECT regexp_replace(coalesce(_p,''), '[^0-9]', '', 'g') AS v) s;
$$;

CREATE OR REPLACE FUNCTION public.is_blocked(_ip text, _phone text, _email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_entities b
    WHERE (b.type = 'ip'    AND coalesce(btrim(_ip),'') <> ''    AND lower(btrim(b.value)) = lower(btrim(_ip)))
       OR (b.type = 'phone' AND public.norm_phone(_phone) <> ''  AND public.norm_phone(b.value) = public.norm_phone(_phone))
       OR (b.type = 'email' AND coalesce(btrim(_email),'') <> '' AND lower(btrim(b.value)) = lower(btrim(_email)))
  );
$$;

REVOKE ALL ON FUNCTION public.is_blocked(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked(text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.norm_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.norm_phone(text) TO service_role;

-- 2) Enforce block list on order insert at the database level
DROP POLICY IF EXISTS "Anyone insert valid orders" ON public.orders;
CREATE POLICY "Anyone insert valid orders" ON public.orders
FOR INSERT TO anon, authenticated
WITH CHECK (
  ((user_id IS NULL) OR (user_id = auth.uid()))
  AND length(btrim(customer_name)) > 1
  AND length(regexp_replace(customer_phone, '[^0-9]', '', 'g')) >= 7
  AND total >= 0
  AND status = 'pending'::order_status
  AND subscription_info IS NULL
  AND account_details IS NULL
  AND subscription_image_url IS NULL
  AND coalesce(array_length(subscription_image_urls, 1), 0) = 0
  AND NOT public.is_blocked(customer_ip, customer_phone, customer_email)
);

-- 3) Admin panel authorization: real Supabase Auth admin role only
CREATE OR REPLACE FUNCTION public.admin_check_code(_code text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END; $$;

-- static-code login / rotation no longer exist
DROP FUNCTION IF EXISTS public.admin_login(text);
DROP FUNCTION IF EXISTS public.admin_change_code(text, text);

-- admin_update_status had its own inline code check: route it through the role check
CREATE OR REPLACE FUNCTION public.admin_update_status(_code text, _order_id uuid, _status order_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  UPDATE public.orders SET status = _status, updated_at = now() WHERE id = _order_id;
END; $$;

CREATE OR REPLACE FUNCTION public.whatsapp_test_send(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_id text; v_token text; v_phone text; v_chat text; v_url text; v_masked text; req_id bigint;
BEGIN
  PERFORM public.admin_check_code(_code);

  SELECT btrim(regexp_replace(value, '\s', '', 'g')) INTO v_id
    FROM public.site_settings WHERE key = 'greenapi_id_instance';
  SELECT btrim(regexp_replace(value, '\s', '', 'g')) INTO v_token
    FROM public.site_settings WHERE key = 'greenapi_api_token';
  SELECT value INTO v_phone FROM public.site_settings WHERE key = 'greenapi_admin_phone';

  v_id := coalesce(v_id, '');
  v_token := coalesce(v_token, '');
  v_phone := regexp_replace(coalesce(v_phone, ''), '[^0-9]', '', 'g');
  IF left(v_phone, 2) = '00' THEN v_phone := substr(v_phone, 3); END IF;
  IF left(v_phone, 1) = '0' THEN v_phone := '964' || regexp_replace(v_phone, '^0+', ''); END IF;

  IF v_id = '' OR v_token = '' OR v_phone = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'whatsapp_not_configured');
  END IF;

  v_chat := v_phone || '@c.us';
  v_url := 'https://api.green-api.com/waInstance' || v_id || '/sendMessage/' || v_token;
  v_masked := 'https://api.green-api.com/waInstance' || v_id || '/sendMessage/'
    || left(v_token, 6) || '...' || right(v_token, 4);

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('chatId', v_chat, 'message', '🧪 رسالة اختبار من FPI STOR (قاعدة البيانات)')
  ) INTO req_id;

  INSERT INTO public.whatsapp_log(url, chat_id, reason, request_id)
    VALUES (v_masked, v_chat, 'test', req_id);

  RETURN jsonb_build_object('success', true, 'url', v_masked, 'chatId', v_chat, 'requestId', req_id);
END; $$;

-- 4) One-time bootstrap: first signed-in user with the legacy code becomes admin
CREATE OR REPLACE FUNCTION public.claim_first_admin(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE h text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN 'ok'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_exists';
  END IF;
  SELECT value INTO h FROM public.site_settings WHERE key = 'admin_code_hash';
  IF h IS NULL OR h = '' THEN RAISE EXCEPTION 'bootstrap_closed'; END IF;
  IF encode(extensions.digest(coalesce(_code,''),'sha256'),'hex') <> h THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  DELETE FROM public.site_settings WHERE key IN ('admin_code_hash','admin_attempts','admin_lock_until');
  RETURN 'ok';
END; $$;

REVOKE ALL ON FUNCTION public.claim_first_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin(text) TO authenticated, service_role;

-- 5) Admin RPCs are for signed-in users only (each verifies the admin role internally)
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'admin\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.admin_check_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_check_code(text) TO service_role;
REVOKE ALL ON FUNCTION public.whatsapp_test_send(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_test_send(text) TO authenticated, service_role;