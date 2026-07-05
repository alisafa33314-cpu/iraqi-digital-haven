
-- Social links
CREATE TABLE public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_links TO anon, authenticated;
GRANT ALL ON public.social_links TO service_role;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read social_links" ON public.social_links FOR SELECT USING (true);

-- Store images (gallery/banners for the store)
CREATE TABLE public.store_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_images TO anon, authenticated;
GRANT ALL ON public.store_images TO service_role;
ALTER TABLE public.store_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read store_images" ON public.store_images FOR SELECT USING (true);

-- Reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "insert review for completed order" ON public.reviews FOR INSERT
  WITH CHECK (
    order_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.status = 'completed')
    AND rating BETWEEN 1 AND 5
  );

-- Multiple subscription images
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subscription_image_urls text[] NOT NULL DEFAULT '{}';

-- RPCs: social_links
CREATE OR REPLACE FUNCTION public.admin_upsert_social(_code text, _id uuid, _name text, _image_url text, _url text, _sort_order integer, _is_active boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE new_id uuid;
BEGIN
  PERFORM public.admin_check_code(_code);
  IF _id IS NULL THEN
    INSERT INTO public.social_links (name, image_url, url, sort_order, is_active)
      VALUES (_name, _image_url, _url, coalesce(_sort_order,0), coalesce(_is_active,true))
      RETURNING id INTO new_id;
    RETURN new_id;
  ELSE
    UPDATE public.social_links SET name=_name, image_url=_image_url, url=_url,
      sort_order=coalesce(_sort_order,0), is_active=coalesce(_is_active,true), updated_at=now()
      WHERE id=_id;
    RETURN _id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_social(_code text, _id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN PERFORM public.admin_check_code(_code); DELETE FROM public.social_links WHERE id=_id; END; $$;

-- RPCs: store_images
CREATE OR REPLACE FUNCTION public.admin_add_store_image(_code text, _image_url text, _sort_order integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE new_id uuid;
BEGIN
  PERFORM public.admin_check_code(_code);
  INSERT INTO public.store_images (image_url, sort_order)
    VALUES (_image_url, coalesce(_sort_order,0)) RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_store_image(_code text, _id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN PERFORM public.admin_check_code(_code); DELETE FROM public.store_images WHERE id=_id; END; $$;

-- Reviews: admin delete + admin list
CREATE OR REPLACE FUNCTION public.admin_delete_review(_code text, _id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN PERFORM public.admin_check_code(_code); DELETE FROM public.reviews WHERE id=_id; END; $$;

-- Complete order accepting multiple images
CREATE OR REPLACE FUNCTION public.admin_complete_order_v2(_code text, _order_id uuid, _info text, _image_urls text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM public.admin_check_code(_code);
  UPDATE public.orders
    SET status='completed',
        subscription_info=_info,
        subscription_image_urls=coalesce(_image_urls,'{}'),
        subscription_image_url = CASE WHEN array_length(_image_urls,1) > 0 THEN _image_urls[1] ELSE NULL END,
        updated_at=now()
    WHERE id=_order_id;
END; $$;

-- Updated get_orders_by_ids to include subscription_image_urls
DROP FUNCTION IF EXISTS public.get_orders_by_ids(uuid[]);
CREATE OR REPLACE FUNCTION public.get_orders_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, customer_name text, customer_phone text, customer_email text,
  total numeric, status order_status, subscription_info text,
  subscription_image_url text, subscription_image_urls text[],
  created_at timestamptz, items jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.customer_name, o.customer_phone, o.customer_email,
    o.total, o.status, o.subscription_info, o.subscription_image_url, o.subscription_image_urls, o.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price
    )) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb) AS items
  FROM public.orders o WHERE o.id = ANY(_ids) ORDER BY o.created_at DESC;
$$;
