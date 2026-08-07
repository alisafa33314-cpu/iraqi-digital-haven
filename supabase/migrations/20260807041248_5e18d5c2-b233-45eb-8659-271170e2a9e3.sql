-- 1) Force unit_price from products table (ignore client-supplied price)
CREATE OR REPLACE FUNCTION public.order_items_enforce_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE p record;
BEGIN
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'invalid_product';
  END IF;
  SELECT id, name, price, is_active INTO p FROM public.products WHERE id = NEW.product_id;
  IF p.id IS NULL OR p.is_active = false THEN
    RAISE EXCEPTION 'invalid_product';
  END IF;
  IF NEW.quantity IS NULL OR NEW.quantity < 1 OR NEW.quantity > 100 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;
  NEW.unit_price := p.price;
  NEW.product_name := p.name;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_order_items_enforce_price ON public.order_items;
CREATE TRIGGER trg_order_items_enforce_price
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_items_enforce_price();

-- 2) Recompute order total server-side from real prices + payment method tax
CREATE OR REPLACE FUNCTION public.orders_recompute_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE sub numeric := 0; t numeric := 0;
BEGIN
  SELECT COALESCE(sum(oi.quantity * oi.unit_price), 0) INTO sub
    FROM public.order_items oi WHERE oi.order_id = NEW.order_id;

  SELECT COALESCE(pm.tax, 0) INTO t
    FROM public.orders o
    LEFT JOIN public.payment_methods pm ON pm.name = o.payment_method_name
    WHERE o.id = NEW.order_id
    LIMIT 1;

  UPDATE public.orders
    SET total = round(sub * (1 + COALESCE(t, 0)))
    WHERE id = NEW.order_id;

  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_recompute_total ON public.order_items;
CREATE TRIGGER trg_orders_recompute_total
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.orders_recompute_total();