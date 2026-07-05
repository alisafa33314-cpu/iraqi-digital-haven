
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method_name text;

DROP FUNCTION IF EXISTS public.admin_list_orders(text);

CREATE OR REPLACE FUNCTION public.admin_list_orders(_code text)
RETURNS TABLE(id uuid, customer_name text, customer_phone text, customer_email text, total numeric, status order_status, subscription_info text, payment_proof_url text, payment_method_name text, created_at timestamp with time zone, items jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  RETURN QUERY
    SELECT o.id, o.customer_name, o.customer_phone, o.customer_email,
      o.total, o.status, o.subscription_info, o.payment_proof_url, o.payment_method_name, o.created_at,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price
      )) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb) AS items
    FROM public.orders o
    ORDER BY o.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_category(_code text, _slug text, _new_slug text, _name text, _icon text, _sort_order integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  IF _slug IS NULL OR _slug = '' THEN
    INSERT INTO public.categories (slug, name, icon, sort_order)
      VALUES (_new_slug, _name, _icon, coalesce(_sort_order,0));
  ELSE
    UPDATE public.categories
      SET slug = coalesce(_new_slug,_slug), name=_name, icon=_icon, sort_order=coalesce(_sort_order,0), updated_at=now()
      WHERE slug=_slug;
    IF _new_slug IS NOT NULL AND _new_slug <> _slug THEN
      UPDATE public.products SET category_slug=_new_slug WHERE category_slug=_slug;
    END IF;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_category(_code text, _slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  UPDATE public.products SET category_slug=NULL WHERE category_slug=_slug;
  DELETE FROM public.categories WHERE slug=_slug;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reorder_category(_code text, _slug text, _sort_order integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  UPDATE public.categories SET sort_order=_sort_order, updated_at=now() WHERE slug=_slug;
END; $$;
