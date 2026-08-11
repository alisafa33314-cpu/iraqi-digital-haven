ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS product_name text;

DELETE FROM public.reviews r
USING public.reviews r2
WHERE r.order_id = r2.order_id AND r.order_id IS NOT NULL AND r.created_at > r2.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_id_unique ON public.reviews (order_id) WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.can_review_order(_order_id uuid, _product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.id = _order_id
        AND o.status = 'completed'::order_status
        AND (_product_id IS NULL OR oi.product_id = _product_id)
    )
    AND NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.order_id = _order_id);
$$;

CREATE OR REPLACE FUNCTION public.reviews_fill_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE o record; pname text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = NEW.order_id;
  IF o.id IS NULL OR o.status <> 'completed'::order_status THEN
    RAISE EXCEPTION 'review_not_allowed';
  END IF;
  NEW.customer_name := coalesce(nullif(btrim(o.customer_name), ''), NEW.customer_name);

  IF NEW.product_id IS NOT NULL THEN
    SELECT oi.product_name INTO pname FROM public.order_items oi
      WHERE oi.order_id = NEW.order_id AND oi.product_id = NEW.product_id LIMIT 1;
    IF pname IS NULL THEN RAISE EXCEPTION 'product_not_in_order'; END IF;
  ELSE
    SELECT string_agg(oi.product_name, ' + ') INTO pname FROM public.order_items oi
      WHERE oi.order_id = NEW.order_id;
  END IF;
  NEW.product_name := pname;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_reviews_fill_from_order ON public.reviews;
CREATE TRIGGER trg_reviews_fill_from_order
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_fill_from_order();

DROP POLICY IF EXISTS "Insert review for purchased product" ON public.reviews;
CREATE POLICY "Insert review for completed order" ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    rating >= 1 AND rating <= 5
    AND order_id IS NOT NULL
    AND public.can_review_order(order_id, product_id)
  );

DROP POLICY IF EXISTS "public read reviews" ON public.reviews;
CREATE POLICY "public read reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;