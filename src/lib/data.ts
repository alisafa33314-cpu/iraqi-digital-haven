// Shared types + helpers. Products/categories/payment methods now live in the
// database and are exposed via `useCatalog` (see ./catalog.ts).

export type Category = {
  slug: string;
  name: string;
  icon: string;
  image_url?: string | null;
  count: number;
};

export type Product = {
  id: string;
  name: string;
  categorySlug: string;
  price: number; // IQD
  image: string;
  description: string;
  inStock: boolean;
  stock?: number;
  activationInstructions?: string | null;
  activationImages?: string[];
  isFeatured?: boolean;
  displayOrder?: number;
  variantGroup?: string | null;
  variantLabel?: string | null;
  variantSort?: number;
  variantPrimary?: boolean;
  // Optional legacy fields, kept for cart-persisted items
  oldPrice?: number;
  bestseller?: boolean;
  isNew?: boolean;
  rating?: number;
  reviews?: number;
};

export type PaymentMethod = {
  id: string;
  name: string;
  number: string;
  note?: string | null;
  image_url?: string | null;
  tax?: number;
};

export const reviews = [
  { name: "أحمد الموسوي", text: "تسليم أسرع من الخيال! خلال دقيقتين وصلني الكود.", rating: 5 },
  { name: "علي حسن", text: "أسعار ممتازة والدعم متعاون جداً. أنصح فيهم بقوة.", rating: 5 },
  { name: "فاطمة كريم", text: "أول مرة أطلب من متجر عراقي ويطلع بهاي الاحترافية.", rating: 5 },
  { name: "مصطفى الجبوري", text: "طلبت اشتراك نتفلكس وشغال 100%. شكراً FPI.", rating: 4 },
];

export const formatIQD = (n: number) =>
  new Intl.NumberFormat("ar-IQ").format(Math.round(n)) + " د.ع";

// Base name of a product that belongs to a duration-variant group
export const baseProductName = (p: Product) =>
  p.variantLabel ? p.name.split(" — ")[0] : p.name;

// Products shown in listings: hide secondary duration variants
export const listableProducts = (products: Product[]) =>
  products.filter((p) => !p.variantGroup || p.variantPrimary);

// All duration variants of a product, ordered
export const variantsOf = (products: Product[], p: Product) =>
  p.variantGroup
    ? products
        .filter((x) => x.variantGroup === p.variantGroup)
        .sort((a, b) => (a.variantSort ?? 0) - (b.variantSort ?? 0))
    : [];
