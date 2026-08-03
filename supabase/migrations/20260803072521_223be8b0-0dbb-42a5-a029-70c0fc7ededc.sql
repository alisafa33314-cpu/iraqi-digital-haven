-- 1. Fix mutable search_path on internal email queue functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, extensions;

-- 2. Revoke EXECUTE on internal / trigger / privileged SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_delivered() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_check_code(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- WhatsApp test send must require the admin code
DROP FUNCTION IF EXISTS public.whatsapp_test_send();

CREATE OR REPLACE FUNCTION public.whatsapp_test_send(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_id text; v_token text; v_phone text; v_chat text; v_url text; v_masked text; req_id bigint;
BEGIN
  IF encode(extensions.digest(_code,'sha256'),'hex') <>
     (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

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
END;
$function$;

-- 3. Orders: replace WITH CHECK (true) with validated insert
DROP POLICY IF EXISTS "Anyone insert orders" ON public.orders;
CREATE POLICY "Anyone insert valid orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND length(btrim(customer_name)) > 1
    AND length(regexp_replace(customer_phone, '[^0-9]', '', 'g')) >= 7
    AND total >= 0
    AND status = 'pending'::order_status
    AND subscription_info IS NULL
    AND account_details IS NULL
    AND subscription_image_url IS NULL
    AND coalesce(array_length(subscription_image_urls, 1), 0) = 0
  );

-- 4. Order items: must belong to a fresh pending order owned by the requester
DROP POLICY IF EXISTS "Anyone insert order items" ON public.order_items;
CREATE POLICY "Insert items for own fresh order" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(btrim(product_name)) > 0
    AND quantity > 0
    AND unit_price >= 0
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.status = 'pending'::order_status
        AND o.created_at > now() - interval '30 minutes'
        AND (o.user_id IS NULL OR o.user_id = auth.uid())
    )
  );

-- 5. Reviews: only for a product actually purchased in a completed order, once each
DROP POLICY IF EXISTS "insert review with valid rating" ON public.reviews;
CREATE POLICY "Insert review for purchased product" ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND order_id IS NOT NULL
    AND product_id IS NOT NULL
    AND length(btrim(customer_name)) > 0
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.id = reviews.order_id
        AND oi.product_id = reviews.product_id
        AND o.status = 'completed'::order_status
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.order_id = reviews.order_id
        AND r.product_id = reviews.product_id
    )
  );

-- 6. Storage: stop public read of payment proofs / delivered account screenshots,
-- and scope uploads to known folders + image extensions.
DROP POLICY IF EXISTS "shop-assets public read" ON storage.objects;
DROP POLICY IF EXISTS "shop-assets anyone upload" ON storage.objects;

CREATE POLICY "shop-assets read public folders" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'shop-assets'
    AND (
      (storage.foldername(name))[1] IN ('products','categories','payments','socials','store','activation','misc')
      -- short window so the uploader can create its signed URL right after upload
      OR created_at > now() - interval '2 minutes'
    )
  );

CREATE POLICY "shop-assets scoped upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'shop-assets'
    AND (storage.foldername(name))[1] IN
      ('products','categories','payments','socials','store','activation','misc','payment-proofs','subscriptions')
    AND lower(regexp_replace(name, '^.*\.', '')) IN ('png','jpg','jpeg','webp','gif','avif','heic')
  );