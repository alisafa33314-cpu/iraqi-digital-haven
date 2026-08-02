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
