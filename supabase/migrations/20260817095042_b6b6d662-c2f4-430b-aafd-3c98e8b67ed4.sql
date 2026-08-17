ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variant_group text,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS variant_sort integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variant_primary boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_variant_group_idx ON public.products (variant_group);