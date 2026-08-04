CREATE TABLE public.blocked_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ip','phone','email')),
  value text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX blocked_entities_type_value_key ON public.blocked_entities (type, lower(btrim(value)));

GRANT ALL ON public.blocked_entities TO service_role;

ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_ip text;

CREATE OR REPLACE FUNCTION public.admin_list_blocked(_code text)
RETURNS TABLE(id uuid, type text, value text, reason text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  RETURN QUERY SELECT b.id, b.type, b.value, b.reason, b.created_at
    FROM public.blocked_entities b ORDER BY b.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_block_entity(_code text, _type text, _value text, _reason text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
DECLARE new_id uuid; v text;
BEGIN
  PERFORM public.admin_check_code(_code);
  IF _type NOT IN ('ip','phone','email') THEN RAISE EXCEPTION 'نوع غير صالح'; END IF;
  v := btrim(coalesce(_value,''));
  IF v = '' THEN RAISE EXCEPTION 'قيمة فارغة'; END IF;
  INSERT INTO public.blocked_entities(type, value, reason) VALUES (_type, v, _reason)
    ON CONFLICT (type, lower(btrim(value))) DO UPDATE SET reason = EXCLUDED.reason
    RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_unblock_entity(_code text, _id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  DELETE FROM public.blocked_entities WHERE id = _id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_blocked(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_block_entity(text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_unblock_entity(text, uuid) FROM anon, authenticated;