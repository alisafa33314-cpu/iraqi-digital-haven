
-- 1) Grants that were missing
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

-- 2) Product offer price
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_price numeric(12,2);

-- 3) Seed marquee + brute-force settings if missing
INSERT INTO public.site_settings(key, value) VALUES
  ('marquee_enabled','true'),
  ('marquee_items', '["⚡ تسليم فوري خلال دقائق","🔥 عروض على كيم باس","🎮 حسابات ستيم بأسعار منافسة","💳 4 طرق دفع مختلفة","🇮🇶 خدمة داخل العراق"]'),
  ('admin_attempts','0'),
  ('admin_lock_until','')
ON CONFLICT (key) DO NOTHING;

-- 4) Admin login with brute-force lock (5 fails => 10 min lock)
CREATE OR REPLACE FUNCTION public.admin_login(_code text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  lock_until_txt text;
  lock_until timestamptz;
  attempts int;
  correct boolean;
  wait_secs int;
BEGIN
  SELECT value INTO lock_until_txt FROM public.site_settings WHERE key='admin_lock_until';
  IF lock_until_txt IS NOT NULL AND lock_until_txt <> '' THEN
    lock_until := lock_until_txt::timestamptz;
    IF now() < lock_until THEN
      wait_secs := ceil(extract(epoch FROM (lock_until - now())))::int;
      RAISE EXCEPTION 'locked:%', wait_secs;
    END IF;
  END IF;

  correct := (encode(extensions.digest(_code,'sha256'),'hex') =
              (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash'));

  IF correct THEN
    UPDATE public.site_settings SET value='0', updated_at=now() WHERE key='admin_attempts';
    UPDATE public.site_settings SET value='', updated_at=now() WHERE key='admin_lock_until';
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(value,'')::int,0) INTO attempts FROM public.site_settings WHERE key='admin_attempts';
  attempts := COALESCE(attempts,0) + 1;
  IF attempts >= 5 THEN
    UPDATE public.site_settings SET value='0', updated_at=now() WHERE key='admin_attempts';
    UPDATE public.site_settings SET value=(now() + interval '10 minutes')::text, updated_at=now() WHERE key='admin_lock_until';
    RAISE EXCEPTION 'locked:600';
  ELSE
    UPDATE public.site_settings SET value=attempts::text, updated_at=now() WHERE key='admin_attempts';
    RAISE EXCEPTION 'invalid:%', (5 - attempts);
  END IF;
END; $$;

-- 5) Change admin code
CREATE OR REPLACE FUNCTION public.admin_change_code(_current text, _new text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.admin_check_code(_current);
  IF length(_new) < 4 THEN RAISE EXCEPTION 'الرمز الجديد قصير جداً'; END IF;
  UPDATE public.site_settings
    SET value = encode(extensions.digest(_new,'sha256'),'hex'), updated_at = now()
    WHERE key = 'admin_code_hash';
END; $$;

-- 6) Generic setting updater (for marquee etc.)
CREATE OR REPLACE FUNCTION public.admin_set_setting(_code text, _key text, _value text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  IF _key IN ('admin_code_hash','admin_attempts','admin_lock_until') THEN
    RAISE EXCEPTION 'مفتاح محجوز';
  END IF;
  INSERT INTO public.site_settings(key, value) VALUES (_key, _value)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END; $$;

-- 7) Extended product upsert with stock + old_price
CREATE OR REPLACE FUNCTION public.admin_upsert_product_v2(
  _code text, _id uuid, _name text, _description text,
  _price numeric, _old_price numeric, _stock integer,
  _image_url text, _category_slug text, _is_active boolean)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE new_id uuid; cat_id uuid;
BEGIN
  PERFORM public.admin_check_code(_code);
  SELECT id INTO cat_id FROM public.categories WHERE slug = _category_slug;
  IF _id IS NULL THEN
    INSERT INTO public.products (name, description, price, old_price, stock, image_url, category_slug, category_id, is_active)
      VALUES (_name, _description, _price, _old_price, COALESCE(_stock,0), _image_url, _category_slug, cat_id, COALESCE(_is_active,true))
      RETURNING id INTO new_id;
    RETURN new_id;
  ELSE
    UPDATE public.products SET name=_name, description=_description, price=_price, old_price=_old_price,
      stock=COALESCE(_stock,0), image_url=_image_url, category_slug=_category_slug, category_id=cat_id,
      is_active=COALESCE(_is_active,true), updated_at=now()
      WHERE id=_id;
    RETURN _id;
  END IF;
END; $$;
