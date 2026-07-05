import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Category, PaymentMethod, Product } from "./data";

type CatalogState = {
  ready: boolean;
  products: Product[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  refresh: () => Promise<void>;
};

export const useCatalog = create<CatalogState>((set, get) => ({
  ready: false,
  products: [],
  categories: [],
  paymentMethods: [],
  refresh: async () => {
    const [pRes, cRes, mRes] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("payment_methods" as any).select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    ]);

    const cats: Category[] = ((cRes.data as any[]) || []).map((c) => ({
      slug: c.slug,
      name: c.name,
      icon: c.icon || "📦",
      count: 0,
    }));

    const prods: Product[] = ((pRes.data as any[]) || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: Number(p.price),
      image: p.image_url || "https://placehold.co/600x600/222/fff?text=No+Image",
      categorySlug: p.category_slug || cats.find((c) => c.slug === (p.category_slug))?.slug || "",
      inStock: (p.stock ?? 1) > 0,
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

    set({ ready: true, products: prods, categories: cats, paymentMethods: pms });
  },
}));

// Snapshot helpers (for route loaders that need synchronous access)
export const getCatalogSnapshot = () => useCatalog.getState();
