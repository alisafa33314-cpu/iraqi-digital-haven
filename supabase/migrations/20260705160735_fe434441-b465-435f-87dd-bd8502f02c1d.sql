
-- Add new columns to orders
ALTER TABLE public.orders
  ADD COLUMN customer_email TEXT,
  ADD COLUMN subscription_info TEXT;

-- Change default status back to pending
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending';

-- Simple public settings table (admin whatsapp)
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.site_settings (key, value) VALUES
  ('admin_whatsapp', '9647700000000'),
  ('admin_code_hash', encode(digest('123123990','sha256'),'hex'));

-- Enable pgcrypto for digest (usually already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function: fetch specific orders by ID list (customer's own orders)
CREATE OR REPLACE FUNCTION public.get_orders_by_ids(_ids UUID[])
RETURNS TABLE (
  id UUID, customer_name TEXT, customer_phone TEXT, customer_email TEXT,
  total NUMERIC, status public.order_status, subscription_info TEXT,
  created_at TIMESTAMPTZ, items JSONB
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.customer_name, o.customer_phone, o.customer_email,
    o.total, o.status, o.subscription_info, o.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price
    )) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb) AS items
  FROM public.orders o
  WHERE o.id = ANY(_ids)
  ORDER BY o.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_orders_by_ids(UUID[]) TO anon, authenticated;

-- Admin: list all orders (requires admin code)
CREATE OR REPLACE FUNCTION public.admin_list_orders(_code TEXT)
RETURNS TABLE (
  id UUID, customer_name TEXT, customer_phone TEXT, customer_email TEXT,
  total NUMERIC, status public.order_status, subscription_info TEXT,
  payment_proof_url TEXT, created_at TIMESTAMPTZ, items JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF encode(digest(_code,'sha256'),'hex') <> (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN QUERY
    SELECT o.id, o.customer_name, o.customer_phone, o.customer_email,
      o.total, o.status, o.subscription_info, o.payment_proof_url, o.created_at,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price
      )) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb) AS items
    FROM public.orders o
    ORDER BY o.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_orders(TEXT) TO anon, authenticated;

-- Admin: complete an order with subscription info
CREATE OR REPLACE FUNCTION public.admin_complete_order(_code TEXT, _order_id UUID, _info TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF encode(digest(_code,'sha256'),'hex') <> (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.orders
    SET status = 'completed', subscription_info = _info, updated_at = now()
    WHERE id = _order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_complete_order(TEXT, UUID, TEXT) TO anon, authenticated;

-- Admin: update status (cancel, etc.)
CREATE OR REPLACE FUNCTION public.admin_update_status(_code TEXT, _order_id UUID, _status public.order_status)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF encode(digest(_code,'sha256'),'hex') <> (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.orders SET status = _status, updated_at = now() WHERE id = _order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_update_status(TEXT, UUID, public.order_status) TO anon, authenticated;
