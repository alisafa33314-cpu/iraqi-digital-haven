-- Explicit admin-only access for sensitive internal tables.
-- All writes continue via SECURITY DEFINER functions / service_role.

REVOKE ALL ON public.blocked_entities FROM anon, authenticated;
REVOKE ALL ON public.page_views FROM anon, authenticated;
REVOKE ALL ON public.page_events FROM anon, authenticated;
REVOKE ALL ON public.whatsapp_log FROM anon, authenticated;
REVOKE ALL ON public.whatsapp_notified FROM anon, authenticated;

GRANT SELECT ON public.blocked_entities TO authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT SELECT ON public.page_events TO authenticated;
GRANT SELECT ON public.whatsapp_log TO authenticated;
GRANT SELECT ON public.whatsapp_notified TO authenticated;

GRANT ALL ON public.blocked_entities TO service_role;
GRANT ALL ON public.page_views TO service_role;
GRANT ALL ON public.page_events TO service_role;
GRANT ALL ON public.whatsapp_log TO service_role;
GRANT ALL ON public.whatsapp_notified TO service_role;

ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notified ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read blocked_entities" ON public.blocked_entities;
CREATE POLICY "Admins read blocked_entities"
  ON public.blocked_entities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read page_views" ON public.page_views;
CREATE POLICY "Admins read page_views"
  ON public.page_views FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read page_events" ON public.page_events;
CREATE POLICY "Admins read page_events"
  ON public.page_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read whatsapp_log" ON public.whatsapp_log;
CREATE POLICY "Admins read whatsapp_log"
  ON public.whatsapp_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read whatsapp_notified" ON public.whatsapp_notified;
CREATE POLICY "Admins read whatsapp_notified"
  ON public.whatsapp_notified FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));