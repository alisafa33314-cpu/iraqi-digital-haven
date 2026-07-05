
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_list_orders(_code text)
 RETURNS TABLE(id uuid, customer_name text, customer_phone text, customer_email text, total numeric, status order_status, subscription_info text, payment_proof_url text, created_at timestamp with time zone, items jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF encode(extensions.digest(_code,'sha256'),'hex') <> (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN QUERY
    SELECT o.id, o.customer_name, o.customer_phone, o.customer_email,
      o.total, o.status, o.subscription_info, o.payment_proof_url, o.created_at,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price
      )) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb) AS items
    FROM public.orders o
    ORDER BY o.created_at DESC;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_complete_order(_code text, _order_id uuid, _info text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF encode(extensions.digest(_code,'sha256'),'hex') <> (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.orders
    SET status = 'completed', subscription_info = _info, updated_at = now()
    WHERE id = _order_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_update_status(_code text, _order_id uuid, _status order_status)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF encode(extensions.digest(_code,'sha256'),'hex') <> (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.orders SET status = _status, updated_at = now() WHERE id = _order_id;
END; $function$;

UPDATE public.site_settings
  SET value = encode(extensions.digest('123123990','sha256'),'hex')
  WHERE key = 'admin_code_hash';
