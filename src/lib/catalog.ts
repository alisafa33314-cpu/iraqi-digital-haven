import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Category, PaymentMethod, Product } from "./data";

export type SocialLink = {
  id: string;
  name: string;
  image_url: string | null;
  url: string;
  sort_order: number;
};

export type StoreImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

export type ReviewRow = {
  id: string;
  order_id: string | null;
  product_id: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type CatalogState = {
  ready: boolean;
  error: string | null;
  products: Product[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  socials: SocialLink[];
  storeImages: StoreImage[];
  reviews: ReviewRow[];
  settings: Record<string, string>;
  refresh: () => Promise<void>;
};

export const useCatalog = create<CatalogState>((set) => ({
  ready: false,
  error: null,
  products: [],
  categories: [],
  paymentMethods: [],
  socials: [],
  storeImages: [],
  reviews: [],
  settings: {},
  refresh: async () => {
    set({ ready: false, error: null });

    try {
      const [pRes, cRes, mRes, sRes, iRes, rRes, stRes] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("sort_order", { ascending: true }),
        supabase.from("payment_methods" as any).select("*").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase.from("social_links" as any).select("*").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase.from("store_images" as any).select("*").order("sort_order", { ascending: true }),
        supabase.from("reviews" as any).select("*").order("created_at", { ascending: false }),
        supabase.from("site_settings" as any).select("key,value"),
      ]);

      const catalogError = [pRes.error, cRes.error].find(Boolean);
      if (catalogError) throw catalogError;

      const cats: Category[] = ((cRes.data as any[]) || []).map((c) => ({
      slug: c.slug,
      name: c.name,
      icon: c.icon || "📦",
      image_url: c.image_url || null,
      count: 0,
    }));

      const prods: Product[] = ((pRes.data as any[]) || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: Number(p.price),
      oldPrice: p.old_price != null ? Number(p.old_price) : undefined,
      stock: p.stock != null ? Number(p.stock) : undefined,
      image: p.image_url || "https://placehold.co/600x600/222/fff?text=No+Image",
      categorySlug: p.category_slug || "",
      inStock: p.is_active !== false,
    }));

      for (const c of cats) c.count = prods.filter((p) => p.categorySlug === c.slug).length;

      const pms: PaymentMethod[] = ((mRes.data as any[]) || []).map((m) => ({
      id: m.id,
      name: m.name,
      number: m.account_number,
      note: m.note,
      image_url: m.image_url,
      tax: Number(m.tax) || 0,
    }));

      const socials: SocialLink[] = ((sRes.data as any[]) || []).map((s) => ({
      id: s.id, name: s.name, image_url: s.image_url, url: s.url, sort_order: s.sort_order || 0,
    }));

      const storeImages: StoreImage[] = ((iRes.data as any[]) || []).map((s) => ({
      id: s.id, image_url: s.image_url, sort_order: s.sort_order || 0,
    }));

      const reviews: ReviewRow[] = ((rRes.data as any[]) || []) as ReviewRow[];

      const settings: Record<string, string> = {};
      for (const row of (stRes.data as any[]) || []) settings[row.key] = row.value;

      set({ ready: true, error: null, products: prods, categories: cats, paymentMethods: pms, socials, storeImages, reviews, settings });
    } catch (error) {
      console.error("Failed to load storefront catalog", error);
      set({ ready: true, error: "تعذر تحميل المنتجات حالياً. يرجى تحديث الصفحة." });
    }
  },
}));

export const getCatalogSnapshot = () => useCatalog.getState();
