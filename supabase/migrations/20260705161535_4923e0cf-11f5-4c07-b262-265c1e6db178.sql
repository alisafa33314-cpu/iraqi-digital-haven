DROP POLICY IF EXISTS "Anyone insert order items" ON public.order_items;

CREATE POLICY "Anyone insert order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  order_id IS NOT NULL
  AND product_name IS NOT NULL
  AND length(trim(product_name)) > 0
  AND quantity > 0
  AND unit_price >= 0
);