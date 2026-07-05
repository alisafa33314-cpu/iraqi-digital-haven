import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./data";

export type CartItem = { product: Product; qty: number };

type CartState = {
  items: CartItem[];
  add: (p: Product) => boolean;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (p) => {
        const max = typeof p.stock === "number" ? p.stock : Infinity;
        const existing = get().items.find((i) => i.product.id === p.id);
        const currentQty = existing?.qty ?? 0;
        if (currentQty + 1 > max) return false;
        set((s) => {
          const ex = s.items.find((i) => i.product.id === p.id);
          if (ex)
            return {
              items: s.items.map((i) =>
                i.product.id === p.id ? { ...i, qty: i.qty + 1, product: p } : i,
              ),
            };
          return { items: [...s.items, { product: p, qty: 1 }] };
        });
        return true;
      },
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.product.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => {
              if (i.product.id !== id) return i;
              const max = typeof i.product.stock === "number" ? i.product.stock : Infinity;
              return { ...i, qty: Math.min(max, Math.max(1, qty)) };
            })
            .filter((i) => i.qty > 0),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((a, i) => a + i.qty, 0),
      subtotal: () => get().items.reduce((a, i) => a + i.qty * i.product.price, 0),
    }),
    { name: "fpi-cart" },
  ),
);

// Store IDs of orders placed by this browser so we can fetch them back
type MyOrdersState = {
  ids: string[];
  addId: (id: string) => void;
};

export const useMyOrderIds = create<MyOrdersState>()(
  persist(
    (set) => ({
      ids: [],
      addId: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)] })),
    }),
    { name: "fpi-my-order-ids" },
  ),
);

// Persist admin unlock
type AdminState = {
  code: string | null;
  setCode: (c: string | null) => void;
};

export const useAdmin = create<AdminState>()(
  persist(
    (set) => ({
      code: null,
      setCode: (c) => set({ code: c }),
    }),
    { name: "fpi-admin" },
  ),
);

// Track orders the user has already reviewed (local, per browser)
type ReviewedState = {
  ids: string[];
  markReviewed: (id: string) => void;
};

export const useReviewedOrders = create<ReviewedState>()(
  persist(
    (set) => ({
      ids: [],
      markReviewed: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)] })),
    }),
    { name: "fpi-reviewed-orders" },
  ),
);

export const STATUS_AR: Record<string, string> = {
  pending: "قيد التنفيذ",
  processing: "جاري التجهيز",
  completed: "مكتمل",
  cancelled: "مرفوض",
};

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};
