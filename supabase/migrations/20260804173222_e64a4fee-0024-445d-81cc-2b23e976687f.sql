DROP POLICY IF EXISTS "Anyone insert valid orders" ON public.orders;

CREATE POLICY "Anyone insert valid orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND length(btrim(customer_name)) > 1
  AND length(regexp_replace(customer_phone, '[^0-9]', '', 'g')) >= 7
  AND total >= 0
  AND status = 'pending'::order_status
  AND NOT public.is_blocked(customer_ip, customer_phone, customer_email)
);