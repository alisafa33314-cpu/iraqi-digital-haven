
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  path text NOT NULL,
  referrer text,
  user_agent text,
  device text,
  country text,
  city text,
  ip_hash text,
  duration_ms integer NOT NULL DEFAULT 0,
  last_ping_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX page_views_session_idx ON public.page_views(session_id);
CREATE INDEX page_views_created_idx ON public.page_views(created_at DESC);
CREATE INDEX page_views_last_ping_idx ON public.page_views(last_ping_at DESC);
CREATE INDEX page_views_path_idx ON public.page_views(path);

CREATE TABLE public.page_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  name text NOT NULL,
  path text,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.page_events TO service_role;
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX page_events_name_idx ON public.page_events(name);
CREATE INDEX page_events_created_idx ON public.page_events(created_at DESC);
