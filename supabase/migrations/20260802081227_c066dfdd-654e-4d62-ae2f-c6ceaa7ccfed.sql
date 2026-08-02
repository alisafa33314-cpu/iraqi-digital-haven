CREATE TABLE IF NOT EXISTS public.whatsapp_notified (
  order_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_notified TO service_role;
ALTER TABLE public.whatsapp_notified ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.whatsapp_notify_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text; v_token text; v_phone text; v_chat text;
  o record; msg text; items text := '';
  it record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'order_not_found'); END IF;
  IF o.created_at < now() - interval '1 hour' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'order_too_old');
  END IF;
  IF EXISTS (SELECT 1 FROM public.whatsapp_notified WHERE order_id = _order_id) THEN
    RETURN jsonb_build_object('success', true, 'reason', 'already_sent');
  END IF;

  SELECT value INTO v_id FROM public.site_settings WHERE key = 'greenapi_id_instance';
  SELECT value INTO v_token FROM public.site_settings WHERE key = 'greenapi_api_token';
  SELECT value INTO v_phone FROM public.site_settings WHERE key = 'greenapi_admin_phone';

  v_id := btrim(coalesce(v_id, ''));
  v_token := btrim(coalesce(v_token, ''));
  v_phone := regexp_replace(coalesce(v_phone, ''), '[^0-9]', '', 'g');
  IF left(v_phone, 2) = '00' THEN v_phone := substr(v_phone, 3); END IF;
  IF left(v_phone, 1) = '0' THEN v_phone := '964' || regexp_replace(v_phone, '^0+', ''); END IF;

  IF v_id = '' OR v_token = '' OR v_phone = '' THEN
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

  PERFORM net.http_post(
    url := 'https://api.green-api.com/waInstance' || v_id || '/sendMessage/' || v_token,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('chatId', v_chat, 'message', msg)
  );

  INSERT INTO public.whatsapp_notified(order_id) VALUES (_order_id)
  ON CONFLICT (order_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.whatsapp_notify_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.whatsapp_notify_order(uuid) TO anon, authenticated, service_role;