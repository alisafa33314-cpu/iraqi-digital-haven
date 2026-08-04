DROP FUNCTION IF EXISTS public.admin_list_orders(text);
CREATE OR REPLACE FUNCTION public.admin_list_orders(_code text)
RETURNS TABLE(id uuid, customer_name text, customer_phone text, customer_email text, customer_ip text, total numeric, status order_status, subscription_info text, subscription_image_url text, subscription_image_urls text[], payment_proof_url text, payment_method_name text, created_at timestamp with time zone, items jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
BEGIN
  PERFORM public.admin_check_code(_code);
  RETURN QUERY
    SELECT o.id, o.customer_name, o.customer_phone, o.customer_email, o.customer_ip,
      o.total, o.status, o.subscription_info,
      o.subscription_image_url, o.subscription_image_urls,
      o.payment_proof_url, o.payment_method_name, o.created_at,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price
      )) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb) AS items
    FROM public.orders o
    ORDER BY o.created_at DESC;
END; $function$;