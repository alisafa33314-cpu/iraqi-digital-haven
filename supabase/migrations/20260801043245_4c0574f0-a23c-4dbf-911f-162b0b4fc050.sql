CREATE TABLE public.product_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  account_details text NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  order_id uuid REFERENCES public.orders(id),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.product_stock TO service_role;

ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage stock" ON public.product_stock FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX product_stock_available_idx ON public.product_stock (product_id, is_used, created_at);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS account_details text;

-- admin: bulk add accounts
CREATE OR REPLACE FUNCTION public.admin_add_stock(_code text, _product_id uuid, _lines text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
DECLARE inserted int := 0; l text;
BEGIN
  PERFORM public.admin_check_code(_code);
  FOREACH l IN ARRAY coalesce(_lines,'{}') LOOP
    IF length(btrim(l)) > 0 THEN
      INSERT INTO public.product_stock (product_id, account_details) VALUES (_product_id, btrim(l));
      inserted := inserted + 1;
    END IF;
  END LOOP;
  RETURN inserted;
END; $$;

-- admin: counts per product
CREATE OR REPLACE FUNCTION public.admin_stock_counts(_code text)
RETURNS TABLE(product_id uuid, available integer, used integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  RETURN QUERY
    SELECT ps.product_id,
           count(*) FILTER (WHERE NOT ps.is_used)::int,
           count(*) FILTER (WHERE ps.is_used)::int
    FROM public.product_stock ps
    GROUP BY ps.product_id;
END; $$;

-- admin: list accounts of a product
CREATE OR REPLACE FUNCTION public.admin_list_stock(_code text, _product_id uuid)
RETURNS TABLE(id uuid, account_details text, is_used boolean, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  RETURN QUERY
    SELECT ps.id, ps.account_details, ps.is_used, ps.created_at
    FROM public.product_stock ps
    WHERE ps.product_id = _product_id
    ORDER BY ps.is_used, ps.created_at;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_stock(_code text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  DELETE FROM public.product_stock WHERE id = _id;
END; $$;

-- auto delivery on checkout
CREATE OR REPLACE FUNCTION public.auto_deliver_order(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
DECLARE
  it record;
  ids uuid[];
  details text := '';
  claimed uuid[] := '{}';
  ord record;
BEGIN
  SELECT * INTO ord FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF ord IS NULL OR ord.status <> 'pending' THEN RETURN false; END IF;

  FOR it IN SELECT product_id, product_name, sum(quantity)::int AS qty
            FROM public.order_items WHERE order_id = _order_id
            GROUP BY product_id, product_name LOOP
    IF it.product_id IS NULL THEN RETURN false; END IF;

    SELECT array_agg(s.id) INTO ids FROM (
      SELECT ps.id FROM public.product_stock ps
      WHERE ps.product_id = it.product_id AND ps.is_used = false
      ORDER BY ps.created_at
      LIMIT it.qty
      FOR UPDATE SKIP LOCKED
    ) s;

    IF ids IS NULL OR array_length(ids,1) < it.qty THEN RETURN false; END IF;

    claimed := claimed || ids;
    details := details || it.product_name || E':\n' ||
      (SELECT string_agg(ps.account_details, E'\n' ORDER BY ps.created_at)
       FROM public.product_stock ps WHERE ps.id = ANY(ids)) || E'\n\n';
  END LOOP;

  IF array_length(claimed,1) IS NULL THEN RETURN false; END IF;

  UPDATE public.product_stock
    SET is_used = true, order_id = _order_id, used_at = now()
    WHERE id = ANY(claimed);

  UPDATE public.orders
    SET status = 'completed', account_details = btrim(details),
        subscription_info = btrim(details), updated_at = now()
    WHERE id = _order_id;

  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.auto_deliver_order(uuid) TO anon, authenticated;