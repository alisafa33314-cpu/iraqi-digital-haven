-- Google OAuth: store email + avatar on profiles, sync on signup, admin customers listing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Backfill existing accounts from auth.users
UPDATE public.profiles p
SET email = u.email,
    avatar_url = COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
FROM auth.users u
WHERE p.id = u.id;

-- Keep the signup trigger in sync (Google sends full_name / avatar_url / picture)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Admin: registered customers listing (paginated + searchable)
CREATE OR REPLACE FUNCTION public.admin_list_customers(_code text, _search text, _limit integer, _offset integer)
RETURNS TABLE(id uuid, full_name text, email text, avatar_url text, phone text, role text, joined_at timestamptz, orders_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.admin_check_code(_code);
  RETURN QUERY
    SELECT p.id, p.full_name, p.email, p.avatar_url, p.phone,
      COALESCE((SELECT r.role::text FROM public.user_roles r WHERE r.user_id = p.id LIMIT 1), 'user') AS role,
      p.created_at AS joined_at,
      (SELECT COUNT(*) FROM public.orders o WHERE o.user_id = p.id) AS orders_count
    FROM public.profiles p
    WHERE (_search IS NULL OR btrim(_search) = ''
           OR p.full_name ILIKE '%' || btrim(_search) || '%'
           OR COALESCE(p.email, '') ILIKE '%' || btrim(_search) || '%')
    ORDER BY p.created_at DESC
    LIMIT GREATEST(COALESCE(_limit, 20), 1)
    OFFSET GREATEST(COALESCE(_offset, 0), 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_count_customers(_code text, _search text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_count bigint;
BEGIN
  PERFORM public.admin_check_code(_code);
  SELECT COUNT(*) INTO v_count
  FROM public.profiles p
  WHERE (_search IS NULL OR btrim(_search) = ''
         OR p.full_name ILIKE '%' || btrim(_search) || '%'
         OR COALESCE(p.email, '') ILIKE '%' || btrim(_search) || '%');
  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_list_customers(text, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_count_customers(text, text) TO anon, authenticated;
GRANT SELECT (id, full_name, phone, email, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, email, avatar_url, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;