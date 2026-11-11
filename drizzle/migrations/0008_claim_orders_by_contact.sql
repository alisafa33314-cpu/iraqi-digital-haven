CREATE OR REPLACE FUNCTION public.claim_my_orders_by_contact()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _phone text;
  _n integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;
  SELECT nullif(trim(phone), '') INTO _phone FROM public.profiles WHERE id = _uid;

  UPDATE public.orders
  SET user_id = _uid
  WHERE user_id IS NULL
    AND (
      (_email IS NOT NULL AND lower(nullif(trim(customer_email), '')) = _email)
      OR (_phone IS NOT NULL AND nullif(trim(customer_phone), '') = _phone)
    );
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_my_orders_by_contact() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_my_orders_by_contact() TO authenticated;