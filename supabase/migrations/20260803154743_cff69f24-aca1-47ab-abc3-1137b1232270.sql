-- 1. Drop unused legacy overloads that widen the public API surface
DROP FUNCTION IF EXISTS public.admin_complete_order(text, uuid, text);
DROP FUNCTION IF EXISTS public.admin_complete_order(text, uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_upsert_product(text, uuid, text, text, numeric, text, text, boolean);
DROP FUNCTION IF EXISTS public.admin_upsert_product_v3(text, uuid, text, text, numeric, numeric, integer, text, text, boolean, text, text[]);
DROP FUNCTION IF EXISTS public.admin_upsert_category(text, text, text, text, text, integer);

-- 2. admin_check_code is only invoked from server-side code (service role) and from
-- inside other SECURITY DEFINER functions, so it must not be callable from the browser.
REVOKE ALL ON FUNCTION public.admin_check_code(text) FROM anon, authenticated, PUBLIC;

-- 3. Internal trigger functions must never be callable through the Data API
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.notify_order_delivered() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
