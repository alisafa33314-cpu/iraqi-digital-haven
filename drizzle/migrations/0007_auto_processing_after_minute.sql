CREATE OR REPLACE FUNCTION public.auto_advance_pending_orders()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.orders SET status = 'processing'
  WHERE status = 'pending' AND created_at <= now() - interval '1 minute';
$$;
GRANT EXECUTE ON FUNCTION public.auto_advance_pending_orders() TO anon, authenticated;