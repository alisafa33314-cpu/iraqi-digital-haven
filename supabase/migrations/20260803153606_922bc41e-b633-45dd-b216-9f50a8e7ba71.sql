-- Data API grants (were missing entirely)
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

-- Helper: checks the parent order is fresh/pending without needing SELECT on orders
CREATE OR REPLACE FUNCTION public.can_add_order_items(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND o.status = 'pending'
      AND o.created_at > now() - interval '30 minutes'
      AND (o.user_id IS NULL OR o.user_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.can_add_order_items(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_add_order_items(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Insert items for own fresh order" ON public.order_items;
CREATE POLICY "Insert items for own fresh order"
ON public.order_items FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(product_name)) > 0
  AND quantity > 0
  AND unit_price >= 0
  AND public.can_add_order_items(order_id)
);
