CREATE OR REPLACE FUNCTION public.admin_delete_order(_code text, _order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.admin_check_code(_code);
  UPDATE public.product_stock
    SET order_id = NULL, is_used = false, used_at = NULL
    WHERE order_id = _order_id;
  DELETE FROM public.reviews WHERE order_id = _order_id;
  DELETE FROM public.order_items WHERE order_id = _order_id;
  DELETE FROM public.orders WHERE id = _order_id;
END; $function$