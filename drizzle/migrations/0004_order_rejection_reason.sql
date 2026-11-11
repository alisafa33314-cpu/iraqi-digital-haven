-- Rejection reason shown to the customer on /orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rejection_reason text;

-- admin_update_status: optional reason, kept only while the order is rejected
DROP FUNCTION IF EXISTS public.admin_update_status(text, uuid, order_status);

CREATE OR REPLACE FUNCTION public.admin_update_status(
  _code text,
  _order_id uuid,
  _status order_status,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.admin_check_code(_code);
  UPDATE public.orders
     SET status = _status,
         updated_at = now(),
         rejection_reason = CASE
           WHEN _status = 'cancelled'
             THEN COALESCE(NULLIF(TRIM(_reason), ''), rejection_reason)
           ELSE NULL
         END
   WHERE id = _order_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_update_status(text, uuid, order_status, text)
  TO anon, authenticated, service_role;

-- get_orders_by_ids: expose rejection_reason to the customer's orders page
DROP FUNCTION IF EXISTS public.get_orders_by_ids(uuid[]);

CREATE OR REPLACE FUNCTION public.get_orders_by_ids(_ids uuid[])
RETURNS TABLE(
  id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  total numeric,
  status order_status,
  subscription_info text,
  subscription_image_url text,
  subscription_image_urls text[],
  rejection_reason text,
  created_at timestamp with time zone,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.id, o.customer_name, o.customer_phone, o.customer_email,
    o.total, o.status, o.subscription_info, o.subscription_image_url, o.subscription_image_urls,
    o.rejection_reason, o.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price
    )) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb) AS items
  FROM public.orders o
  WHERE o.id = ANY(_ids)
  ORDER BY o.created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_orders_by_ids(uuid[]) TO anon, authenticated, service_role;