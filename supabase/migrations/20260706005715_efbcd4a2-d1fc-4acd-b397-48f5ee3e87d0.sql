ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;

CREATE OR REPLACE FUNCTION public.admin_upsert_category(_code text, _slug text, _new_slug text, _name text, _icon text, _sort_order integer, _image_url text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM public.admin_check_code(_code);
  IF _slug IS NULL OR _slug = '' THEN
    INSERT INTO public.categories (slug, name, icon, sort_order, image_url)
      VALUES (_new_slug, _name, _icon, coalesce(_sort_order,0), _image_url);
  ELSE
    UPDATE public.categories
      SET slug = coalesce(_new_slug,_slug), name=_name, icon=_icon,
          sort_order=coalesce(_sort_order,0), image_url=_image_url, updated_at=now()
      WHERE slug=_slug;
    IF _new_slug IS NOT NULL AND _new_slug <> _slug THEN
      UPDATE public.products SET category_slug=_new_slug WHERE category_slug=_slug;
    END IF;
  END IF;
END; $function$;