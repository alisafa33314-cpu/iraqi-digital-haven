CREATE OR REPLACE FUNCTION public.track_view(_session text, _path text, _referrer text, _ua text, _device text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF length(coalesce(_session,'')) = 0 OR length(_session) > 100 OR length(coalesce(_path,'')) = 0 THEN RETURN NULL; END IF;
  INSERT INTO page_views(session_id, path, referrer, user_agent, device)
  VALUES (_session, left(_path,300), left(_referrer,500), left(_ua,500), left(coalesce(_device,'Desktop'),40))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.track_ping(_id uuid, _session text, _duration integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE page_views SET duration_ms = greatest(0, least(_duration, 21600000)), last_ping_at = now()
  WHERE id = _id AND session_id = _session AND created_at > now() - interval '7 hours';
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  PERFORM public.admin_check_code(_code);
  SELECT jsonb_build_object(
    'visitors24h', (SELECT count(DISTINCT session_id) FROM page_views WHERE created_at > now()-interval '24 hours'),
    'views24h', (SELECT count(*) FROM page_views WHERE created_at > now()-interval '24 hours'),
    'visitors7d', (SELECT count(DISTINCT session_id) FROM page_views WHERE created_at > now()-interval '7 days'),
    'views7d', (SELECT count(*) FROM page_views WHERE created_at > now()-interval '7 days'),
    'liveUsers', (SELECT count(DISTINCT session_id) FROM page_views WHERE last_ping_at > now()-interval '2 minutes'),
    'livePages', coalesce((SELECT jsonb_agg(x) FROM (SELECT path, count(DISTINCT session_id) n FROM page_views WHERE last_ping_at > now()-interval '2 minutes' GROUP BY path ORDER BY n DESC LIMIT 10) x),'[]'),
    'topPages', coalesce((SELECT jsonb_agg(x) FROM (SELECT path, count(*) views, round(avg(duration_ms))::int "avgMs" FROM page_views WHERE created_at > now()-interval '7 days' GROUP BY path ORDER BY views DESC LIMIT 15) x),'[]'),
    'countries', coalesce((SELECT jsonb_agg(x) FROM (SELECT coalesce(country,'غير معروف') k, count(*) n FROM page_views WHERE created_at > now()-interval '7 days' GROUP BY 1 ORDER BY n DESC LIMIT 15) x),'[]'),
    'cities', coalesce((SELECT jsonb_agg(x) FROM (SELECT city k, count(*) n FROM page_views WHERE created_at > now()-interval '7 days' AND city IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT 15) x),'[]'),
    'devices', coalesce((SELECT jsonb_agg(x) FROM (SELECT coalesce(device,'unknown') k, count(*) n FROM page_views WHERE created_at > now()-interval '7 days' GROUP BY 1 ORDER BY n DESC) x),'[]'),
    'recentEvents', coalesce((SELECT jsonb_agg(x) FROM (SELECT name, path, data, created_at FROM page_events WHERE created_at > now()-interval '7 days' ORDER BY created_at DESC LIMIT 50) x),'[]')
  ) INTO r;
  RETURN r;
END $$;

GRANT EXECUTE ON FUNCTION public.track_view(text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_ping(uuid,text,integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics(text) TO anon, authenticated;