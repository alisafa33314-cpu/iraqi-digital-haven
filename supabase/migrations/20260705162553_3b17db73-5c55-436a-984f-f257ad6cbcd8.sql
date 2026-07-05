
-- Payment methods table
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_number text NOT NULL,
  note text,
  image_url text,
  tax numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active payment methods"
  ON public.payment_methods FOR SELECT USING (is_active = true);
CREATE TRIGGER trg_pm_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add category_slug to products for simpler frontend (avoid join)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_slug text;

-- Seed categories (idempotent)
INSERT INTO public.categories (slug, name, icon, sort_order) VALUES
  ('kim-pass','كيم باس','🎮',1),
  ('xbox','ألعاب اكس بوكس','🕹️',2),
  ('streaming','خدمات البث','📺',3),
  ('gift-cards','الكفت كارد','🎁',4),
  ('steam','حسابات ستيم اوفلاين','🎯',5),
  ('ai','اشتراكات الذكاء الاصطناعي','🤖',6)
ON CONFLICT (slug) DO NOTHING;

-- Seed products (idempotent by name)
INSERT INTO public.products (name, description, price, image_url, is_active, category_slug, category_id)
SELECT v.name, v.description, v.price, v.image_url, true, v.category_slug, c.id
FROM (VALUES
  ('PUBG Mobile — 660 UC','شحن مباشر 660 UC لحساب PUBG Mobile. يتم التسليم خلال دقائق بعد التأكيد.',12000,'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80','kim-pass'),
  ('Xbox Game Pass Ultimate — 3 أشهر','اشتراك 3 أشهر Ultimate يشمل مئات الألعاب على اكس بوكس والحاسوب.',45000,'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=800&q=80','xbox'),
  ('Netflix Premium — شهر كامل','اشتراك نتفلكس 4K UHD لجهاز واحد. تسليم سريع بعد الدفع.',18000,'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80','streaming'),
  ('iTunes Gift Card — 25$','بطاقة آيتونز أمريكية بقيمة 25 دولار، مباشرة بالكود.',42000,'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80','gift-cards'),
  ('حساب ستيم — GTA V + RDR2','حساب ستيم اوفلاين يحتوي على GTA V + Red Dead Redemption 2.',35000,'https://images.unsplash.com/photo-1592155931584-901ac15763e3?auto=format&fit=crop&w=800&q=80','steam'),
  ('ChatGPT Plus — شهر','اشتراك ChatGPT Plus لمدة شهر مع GPT-4 و DALL·E.',32000,'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80','ai'),
  ('Shahid VIP — 3 أشهر','اشتراك شاهد VIP لمدة 3 أشهر.',22000,'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80','streaming')
) AS v(name, description, price, image_url, category_slug)
LEFT JOIN public.categories c ON c.slug = v.category_slug
WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.name = v.name);

-- Seed payment methods
INSERT INTO public.payment_methods (name, account_number, note, tax, sort_order)
SELECT * FROM (VALUES
  ('آسيا سيل','07770586502','تُضاف ضريبة 20% تلقائياً',0.20,1),
  ('ماستر رافدين','5239499592',NULL,0,2),
  ('زين كاش','07750795444',NULL,0,3),
  ('Binance USDT','1032524496',NULL,0,4)
) AS v(name, account_number, note, tax, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods);

-- Products/categories public read policies (ensure)
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT USING (true);

-- Admin RPCs (use pgcrypto)
CREATE OR REPLACE FUNCTION public.admin_check_code(_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$ BEGIN
  IF encode(extensions.digest(_code,'sha256'),'hex') <> (SELECT value FROM public.site_settings WHERE key = 'admin_code_hash') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END; $$;

-- Product CRUD
CREATE OR REPLACE FUNCTION public.admin_upsert_product(
  _code text, _id uuid, _name text, _description text, _price numeric,
  _image_url text, _category_slug text, _is_active boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE new_id uuid; cat_id uuid;
BEGIN
  PERFORM public.admin_check_code(_code);
  SELECT id INTO cat_id FROM public.categories WHERE slug = _category_slug;
  IF _id IS NULL THEN
    INSERT INTO public.products (name, description, price, image_url, category_slug, category_id, is_active)
      VALUES (_name, _description, _price, _image_url, _category_slug, cat_id, coalesce(_is_active,true))
      RETURNING id INTO new_id;
    RETURN new_id;
  ELSE
    UPDATE public.products SET name=_name, description=_description, price=_price,
      image_url=_image_url, category_slug=_category_slug, category_id=cat_id,
      is_active=coalesce(_is_active,true), updated_at=now()
      WHERE id=_id;
    RETURN _id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_product(_code text, _id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$ BEGIN
  PERFORM public.admin_check_code(_code);
  DELETE FROM public.products WHERE id = _id;
END; $$;

-- Payment method CRUD
CREATE OR REPLACE FUNCTION public.admin_upsert_payment_method(
  _code text, _id uuid, _name text, _account_number text, _note text,
  _image_url text, _tax numeric, _sort_order int, _is_active boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE new_id uuid;
BEGIN
  PERFORM public.admin_check_code(_code);
  IF _id IS NULL THEN
    INSERT INTO public.payment_methods (name, account_number, note, image_url, tax, sort_order, is_active)
      VALUES (_name, _account_number, _note, _image_url, coalesce(_tax,0), coalesce(_sort_order,0), coalesce(_is_active,true))
      RETURNING id INTO new_id;
    RETURN new_id;
  ELSE
    UPDATE public.payment_methods SET name=_name, account_number=_account_number, note=_note,
      image_url=_image_url, tax=coalesce(_tax,0), sort_order=coalesce(_sort_order,0),
      is_active=coalesce(_is_active,true), updated_at=now()
      WHERE id=_id;
    RETURN _id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_payment_method(_code text, _id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$ BEGIN
  PERFORM public.admin_check_code(_code);
  DELETE FROM public.payment_methods WHERE id = _id;
END; $$;
