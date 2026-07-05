
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subscription_image_url text;

CREATE POLICY "shop-assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-assets');

CREATE POLICY "shop-assets anyone upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shop-assets');

CREATE POLICY "shop-assets anyone update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'shop-assets');

CREATE POLICY "shop-assets anyone delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'shop-assets');

CREATE OR REPLACE FUNCTION public.admin_complete_order(_code text, _order_id uuid, _info text, _image_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  UPDATE public.orders
    SET status = 'completed', subscription_info = _info, subscription_image_url = _image_url, updated_at = now()
    WHERE id = _order_id;
END; $$;

DROP FUNCTION IF EXISTS public.get_orders_by_ids(uuid[]);

CREATE OR REPLACE FUNCTION public.get_orders_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, customer_name text, customer_phone text, customer_email text, total numeric, status order_status, subscription_info text, subscription_image_url text, created_at timestamp with time zone, items jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT o.id, o.customer_name, o.customer_phone, o.customer_email,
    o.total, o.status, o.subscription_info, o.subscription_image_url, o.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price
    )) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb) AS items
  FROM public.orders o
  WHERE o.id = ANY(_ids)
  ORDER BY o.created_at DESC;
$$;
