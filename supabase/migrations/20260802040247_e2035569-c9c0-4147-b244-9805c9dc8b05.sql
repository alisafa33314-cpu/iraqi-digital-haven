ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS activation_instructions text,
  ADD COLUMN IF NOT EXISTS activation_images text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.admin_upsert_product_v3(
  _code text, _id uuid, _name text, _description text, _price numeric, _old_price numeric,
  _stock integer, _image_url text, _category_slug text, _is_active boolean,
  _activation_instructions text DEFAULT NULL, _activation_images text[] DEFAULT '{}'::text[]
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE new_id uuid; cat_id uuid;
BEGIN
  PERFORM public.admin_check_code(_code);
  SELECT id INTO cat_id FROM public.categories WHERE slug = _category_slug;
  IF _id IS NULL THEN
    INSERT INTO public.products (name, description, price, old_price, stock, image_url, category_slug, category_id, is_active, activation_instructions, activation_images)
      VALUES (_name, _description, _price, _old_price, COALESCE(_stock,0), _image_url, _category_slug, cat_id, COALESCE(_is_active,true), _activation_instructions, COALESCE(_activation_images,'{}'))
      RETURNING id INTO new_id;
    RETURN new_id;
  ELSE
    UPDATE public.products SET name=_name, description=_description, price=_price, old_price=_old_price,
      stock=COALESCE(_stock,0), image_url=_image_url, category_slug=_category_slug, category_id=cat_id,
      is_active=COALESCE(_is_active,true), activation_instructions=_activation_instructions,
      activation_images=COALESCE(_activation_images,'{}'), updated_at=now()
      WHERE id=_id;
    RETURN _id;
  END IF;
END; $function$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_product_v3(text, uuid, text, text, numeric, numeric, integer, text, text, boolean, text, text[]) TO anon, authenticated;