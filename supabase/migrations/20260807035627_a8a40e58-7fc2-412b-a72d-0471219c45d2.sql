CREATE OR REPLACE FUNCTION public.telegram_notify_order(_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token text; v_chat text; o record; it record;
  items text := ''; msg text; req_id bigint; proof text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'order_not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.telegram_notified WHERE order_id = _order_id) THEN
    RETURN jsonb_build_object('success', true, 'reason', 'already_sent');
  END IF;

  SELECT btrim(value) INTO v_token FROM public.site_settings WHERE key = 'telegram_bot_token';
  SELECT btrim(value) INTO v_chat  FROM public.site_settings WHERE key = 'telegram_chat_id';
  IF coalesce(v_token,'') = '' OR coalesce(v_chat,'') = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'telegram_not_configured');
  END IF;

  FOR it IN SELECT product_name, quantity, unit_price FROM public.order_items WHERE order_id = _order_id LOOP
    items := items || '• ' || it.product_name || ' × ' || it.quantity || ' — '
      || to_char(round(it.unit_price * it.quantity), 'FM999,999,999') || ' IQD' || E'\n';
  END LOOP;

  proof := btrim(coalesce(o.payment_proof_url, ''));
  IF proof !~* '^https?://' THEN proof := ''; END IF;

  msg := '🛒 <b>طلب جديد — FPI STOR</b>' || E'\n\n'
    || '🆔 <code>#' || upper(left(o.id::text, 8)) || '</code>' || E'\n'
    || '👤 ' || coalesce(o.customer_name, '—') || E'\n'
    || '📞 <code>' || coalesce(o.customer_phone, '—') || '</code>' || E'\n'
    || coalesce('✉️ ' || o.customer_email || E'\n', '')
    || '💳 ' || coalesce(o.payment_method_name, '—') || E'\n\n'
    || '<b>المنتجات:</b>' || E'\n' || coalesce(nullif(items, ''), '—') || E'\n'
    || '💰 <b>الإجمالي:</b> ' || to_char(round(o.total), 'FM999,999,999') || ' IQD';

  IF proof <> '' THEN
    -- إرسال صورة إثبات الدفع نفسها مع تفاصيل الطلب كـ caption
    SELECT net.http_post(
      url := 'https://api.telegram.org/bot' || v_token || '/sendPhoto',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('chat_id', v_chat, 'photo', proof,
                                 'caption', msg, 'parse_mode', 'HTML')
    ) INTO req_id;
  ELSE
    SELECT net.http_post(
      url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('chat_id', v_chat, 'text', msg, 'parse_mode', 'HTML',
                                 'disable_web_page_preview', false)
    ) INTO req_id;
  END IF;

  INSERT INTO public.telegram_notified(order_id) VALUES (_order_id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true, 'requestId', req_id, 'withPhoto', proof <> '');
END; $function$;

CREATE OR REPLACE FUNCTION public.whatsapp_notify_order(_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id text; v_token text; v_phone text; v_chat text; v_url text; v_masked text;
  o record; msg text; items text := ''; it record; req_id bigint; proof text; v_method text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN
    INSERT INTO public.whatsapp_log(order_id, reason) VALUES (_order_id, 'order_not_found');
    RETURN jsonb_build_object('success', false, 'reason', 'order_not_found');
  END IF;
  IF o.created_at < now() - interval '1 hour' THEN
    INSERT INTO public.whatsapp_log(order_id, reason) VALUES (_order_id, 'order_too_old');
    RETURN jsonb_build_object('success', false, 'reason', 'order_too_old');
  END IF;
  IF EXISTS (SELECT 1 FROM public.whatsapp_notified WHERE order_id = _order_id) THEN
    RETURN jsonb_build_object('success', true, 'reason', 'already_sent');
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
    INSERT INTO public.whatsapp_log(order_id, reason) VALUES (_order_id, 'whatsapp_not_configured');
    RETURN jsonb_build_object('success', false, 'reason', 'whatsapp_not_configured');
  END IF;

  FOR it IN SELECT product_name, quantity, unit_price FROM public.order_items WHERE order_id = _order_id LOOP
    items := items || '• ' || it.product_name || ' × ' || it.quantity || ' — '
      || to_char(round(it.unit_price * it.quantity), 'FM999,999,999') || ' IQD' || E'\n';
  END LOOP;

  msg := '🛒 *طلب جديد — FPI STOR*' || E'\n\n'
    || '🆔 رقم الطلب: ' || upper(left(o.id::text, 8)) || E'\n'
    || '👤 الزبون: ' || coalesce(o.customer_name, '—') || E'\n'
    || '📞 الهاتف: ' || coalesce(o.customer_phone, '—') || E'\n'
    || coalesce('✉️ الإيميل: ' || o.customer_email || E'\n', '')
    || E'\n*المنتجات:*\n' || coalesce(nullif(items, ''), '—') || E'\n'
    || '💳 وسيلة الدفع: ' || coalesce(o.payment_method_name, '—') || E'\n'
    || '💰 الإجمالي: ' || to_char(round(o.total), 'FM999,999,999') || ' IQD';

  v_chat := v_phone || '@c.us';
  proof := btrim(coalesce(o.payment_proof_url, ''));
  IF proof !~* '^https?://' THEN proof := ''; END IF;

  IF proof <> '' THEN
    v_method := 'sendFileByUrl';
  ELSE
    v_method := 'sendMessage';
  END IF;

  v_url := 'https://api.green-api.com/waInstance' || v_id || '/' || v_method || '/' || v_token;
  v_masked := 'https://api.green-api.com/waInstance' || v_id || '/' || v_method || '/'
    || left(v_token, 6) || '...' || right(v_token, 4);

  RAISE LOG 'whatsapp_notify_order url=% chat=%', v_masked, v_chat;

  IF proof <> '' THEN
    SELECT net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('chatId', v_chat, 'urlFile', proof,
                                 'fileName', 'payment_proof.jpg', 'caption', msg)
    ) INTO req_id;
  ELSE
    SELECT net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('chatId', v_chat, 'message', msg)
    ) INTO req_id;
  END IF;

  INSERT INTO public.whatsapp_log(order_id, url, chat_id, reason, request_id)
    VALUES (_order_id, v_masked, v_chat, CASE WHEN proof <> '' THEN 'sent_file' ELSE 'sent' END, req_id);

  INSERT INTO public.whatsapp_notified(order_id) VALUES (_order_id)
    ON CONFLICT (order_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'url', v_masked, 'chatId', v_chat,
                            'requestId', req_id, 'withPhoto', proof <> '');
END; $function$;