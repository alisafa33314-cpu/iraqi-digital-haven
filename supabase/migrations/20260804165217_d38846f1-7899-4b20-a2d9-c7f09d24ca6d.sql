REVOKE EXECUTE ON FUNCTION public.whatsapp_notify_order(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_notify_order(uuid) TO service_role;