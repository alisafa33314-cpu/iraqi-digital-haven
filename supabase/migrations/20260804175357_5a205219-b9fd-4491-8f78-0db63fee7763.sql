-- 1) admin helper (thin wrapper over has_role)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role);
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 2) fail-open is_blocked
CREATE OR REPLACE FUNCTION public.is_blocked(_ip text, _phone text, _email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(btrim(_ip),'') = ''
     AND public.norm_phone(_phone) = ''
     AND coalesce(btrim(_email),'') = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.blocked_entities b
    WHERE (b.type = 'ip'    AND coalesce(btrim(_ip),'') <> ''    AND lower(btrim(b.value)) = lower(btrim(_ip)))
       OR (b.type = 'phone' AND public.norm_phone(_phone) <> ''  AND public.norm_phone(b.value) = public.norm_phone(_phone))
       OR (b.type = 'email' AND coalesce(btrim(_email),'') <> '' AND lower(btrim(b.value)) = lower(btrim(_email)))
  );
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_blocked(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked(text, text, text) TO anon, authenticated, service_role;

-- 3) second layer: reject blocked customers even on direct API inserts
CREATE OR REPLACE FUNCTION public.orders_block_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_blocked(NEW.customer_ip, NEW.customer_phone, NEW.customer_email) THEN
    RAISE EXCEPTION 'order_rejected';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.orders_block_guard() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_orders_block_guard ON public.orders;
CREATE TRIGGER trg_orders_block_guard
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_block_guard();

-- 4) remove duplicate public catalog read policies (one remains for each)
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;