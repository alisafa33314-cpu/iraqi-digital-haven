CREATE OR REPLACE FUNCTION public.is_blocked(_ip text, _phone text, _email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_entities b
    WHERE (b.type = 'ip'    AND coalesce(btrim(_ip),'') <> ''    AND lower(btrim(b.value)) = lower(btrim(_ip)))
       OR (b.type = 'phone' AND public.norm_phone(_phone) <> ''  AND public.norm_phone(b.value) = public.norm_phone(_phone))
       OR (b.type = 'email' AND coalesce(btrim(_email),'') <> '' AND lower(btrim(b.value)) = lower(btrim(_email)))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.norm_phone(text) TO anon, authenticated, service_role;