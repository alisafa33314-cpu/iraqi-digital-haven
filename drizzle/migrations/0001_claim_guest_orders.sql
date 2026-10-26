CREATE OR REPLACE FUNCTION public.claim_my_orders(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  UPDATE public.orders
  SET user_id = auth.uid(), updated_at = now()
  WHERE id = ANY(_ids)
    AND user_id IS NULL;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_my_orders(uuid[]) TO authenticated;